import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/chat/domain/models/message.dart';
import '../../features/matches/presentation/providers/matches_provider.dart';
import '../router/router.dart';
import '../theme/theme.dart';
import 'ws_events.dart';
import 'ws_manager.dart';

/// Global messenger key so the dispatcher can raise SnackBars (the match toast)
/// from outside the widget tree. Wired into MaterialApp.router in app.dart.
final feelsScaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// The match id of the conversation currently on screen, or `null` if none.
///
/// [ConversationScreen] sets this on open and clears it on close so the global
/// [WsDispatcher] doesn't raise an unread badge for the chat you're already
/// reading.
final activeConversationProvider = StateProvider<String?>((ref) => null);

/// App-global WebSocket dispatcher.
///
/// Keeps the match/inbox list live even when no conversation is open — the
/// main win of a single app-wide socket. Per-conversation concerns (rendering
/// messages, typing, read receipts, image toggles) stay in
/// [ConversationScreen], which subscribes to the same broadcast stream.
class WsDispatcher {
  WsDispatcher(this._ref);

  final Ref _ref;
  StreamSubscription<WsEvent>? _sub;

  /// Begin routing events into the inbox. Idempotent.
  void start() {
    _sub ??= _ref.read(wsManagerProvider).events.listen(_onEvent);
  }

  /// Stop routing events. Idempotent.
  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
  }

  void _onEvent(WsEvent event) {
    final matches = _ref.read(matchesProvider.notifier);
    switch (event) {
      case NewMessageEvent e:
        _onNewMessage(e, matches);
      case MatchCreatedEvent e:
        _onMatchCreated(e);
      case MatchDeletedEvent e:
        matches.onMatchDeleted(e.matchId);
      default:
        // typing / read / image / connected are handled by the open
        // conversation screen, not the global inbox.
        break;
    }
  }

  void _onNewMessage(NewMessageEvent e, MatchesNotifier matches) {
    final known =
        _ref.read(matchesProvider).matches.any((m) => m.id == e.matchId);
    if (!known) {
      // A message for a match we don't have yet (e.g. it arrived before the
      // match_created event). Fetch the match — it comes back with the
      // server's own last-message and unread count, so this self-heals.
      matches.onMatchCreated(e.matchId);
      return;
    }

    final msg = Message.fromJson(e.message);
    // The server only sends new_message to the recipient, never echoes it to
    // the sender — so every event here is an inbound message. Don't badge the
    // conversation the user is actively reading.
    final isReading = _ref.read(activeConversationProvider) == e.matchId;
    matches.updateMatchLastMessage(
      e.matchId,
      content: _preview(msg),
      senderId: msg.senderId,
      createdAt: msg.createdAt,
      unreadIncrement: isReading ? null : 1,
    );
  }

  /// A new match arrived. Update the inbox, then toast it — unless the user is
  /// on the feed, where the in-feed match animation already celebrates it (the
  /// swiper gets both events; the other person only gets this).
  Future<void> _onMatchCreated(MatchCreatedEvent e) async {
    await _ref.read(matchesProvider.notifier).onMatchCreated(e.matchId);
    if (_isOnFeed()) return;

    final matched =
        _ref.read(matchesProvider).matches.where((m) => m.id == e.matchId);
    final match = matched.isNotEmpty ? matched.first : null;
    _showMatchToast(e.matchId, match?.otherUser.name, match?.sharedPlace);
  }

  bool _isOnFeed() {
    try {
      final path = _ref
          .read(routerProvider)
          .routerDelegate
          .currentConfiguration
          .uri
          .path;
      return path.startsWith(RoutePaths.feed);
    } catch (_) {
      return false;
    }
  }

  void _showMatchToast(String matchId, String? name, String? sharedPlace) {
    final messenger = feelsScaffoldMessengerKey.currentState;
    if (messenger == null) return;
    final who = (name != null && name.trim().isNotEmpty) ? name : 'someone new';
    final nabe = (sharedPlace != null && sharedPlace.isNotEmpty)
        ? " — you're both in $sharedPlace"
        : '';
    messenger
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: FeelsColors.primary,
          duration: const Duration(seconds: 5),
          content: Text(
            "It's a match with $who \u{1F389}$nabe",
            style: const TextStyle(
              color: FeelsColors.textPrimary,
              fontWeight: FeelsTypography.weightHeading,
            ),
          ),
          action: SnackBarAction(
            label: 'Say hi',
            textColor: FeelsColors.textPrimary,
            onPressed: () => _ref.read(routerProvider).go(
                  Uri(
                    path: '${RoutePaths.chat}/$matchId',
                    queryParameters: name != null ? {'name': name} : null,
                  ).toString(),
                ),
          ),
        ),
      );
  }

  /// Inbox preview text for a message. Image-only messages have no content, so
  /// show a photo marker instead of a blank line.
  String _preview(Message m) {
    final text = m.content?.trim() ?? '';
    if (text.isNotEmpty) return text;
    if (m.imageUrl != null) return '\u{1F4F7} Photo';
    return '';
  }
}

/// App-lifetime dispatcher. Started/stopped with the auth session from
/// [FeelsApp].
final wsDispatcherProvider = Provider<WsDispatcher>((ref) {
  final dispatcher = WsDispatcher(ref);
  ref.onDispose(dispatcher.stop);
  return dispatcher;
});
