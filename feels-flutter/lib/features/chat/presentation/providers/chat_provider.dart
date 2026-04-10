import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/api_client.dart';
import '../../data/chat_api.dart';
import '../../data/chat_repository.dart';
import '../../domain/models/message.dart';

// ---------------------------------------------------------------------------
// Dependency providers (override at app level with configured Dio)
// ---------------------------------------------------------------------------

final chatApiProvider = Provider<ChatApi>((ref) {
  return ChatApi(dio: ref.read(apiClientProvider));
});

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(api: ref.watch(chatApiProvider));
});

// ---------------------------------------------------------------------------
// Conversation state
// ---------------------------------------------------------------------------

class ConversationState {
  final List<Message> messages;
  final bool isLoading;
  final bool isLoadingMore;
  final bool hasMore;
  final ImageStatus imageStatus;
  final String? error;

  const ConversationState({
    this.messages = const [],
    this.isLoading = false,
    this.isLoadingMore = false,
    this.hasMore = true,
    this.imageStatus = ImageStatus.none,
    this.error,
  });

  ConversationState copyWith({
    List<Message>? messages,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasMore,
    ImageStatus? imageStatus,
    String? error,
  }) {
    return ConversationState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasMore: hasMore ?? this.hasMore,
      imageStatus: imageStatus ?? this.imageStatus,
      error: error,
    );
  }
}

// ---------------------------------------------------------------------------
// Typing state (per-conversation)
// ---------------------------------------------------------------------------

class TypingState {
  final bool isOtherTyping;
  final DateTime? lastTypingAt;

  const TypingState({this.isOtherTyping = false, this.lastTypingAt});
}

/// Typing provider family, keyed by matchId.
final typingProvider =
    StateNotifierProvider.family<TypingNotifier, TypingState, String>(
  (ref, matchId) => TypingNotifier(),
);

class TypingNotifier extends StateNotifier<TypingState> {
  Timer? _timeoutTimer;

  TypingNotifier() : super(const TypingState());

  /// Called when a typing_start WebSocket event arrives.
  void onTypingStart() {
    _timeoutTimer?.cancel();
    state = TypingState(isOtherTyping: true, lastTypingAt: DateTime.now());
    // Auto-clear after 4 seconds if no new typing events.
    _timeoutTimer = Timer(const Duration(seconds: 4), () {
      state = const TypingState(isOtherTyping: false);
    });
  }

  /// Called when a typing_stop WebSocket event arrives.
  void onTypingStop() {
    _timeoutTimer?.cancel();
    state = const TypingState(isOtherTyping: false);
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    super.dispose();
  }
}

// ---------------------------------------------------------------------------
// Conversation notifier (per match)
// ---------------------------------------------------------------------------

class ConversationNotifier extends StateNotifier<ConversationState> {
  final ChatRepository _repository;
  final String matchId;

  static const int _pageSize = 50;

  ConversationNotifier({
    required ChatRepository repository,
    required this.matchId,
  })  : _repository = repository,
        super(const ConversationState());

  /// Load initial messages for this conversation.
  Future<void> loadMessages() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _repository.getMessages(matchId, limit: _pageSize);
      state = state.copyWith(
        messages: response.messages,
        isLoading: false,
        hasMore: response.hasMore,
        imageStatus: response.imageStatus,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Load older messages (pagination on scroll to top).
  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore) return;
    state = state.copyWith(isLoadingMore: true);
    try {
      final response = await _repository.getMessages(
        matchId,
        limit: _pageSize,
        offset: state.messages.length,
      );
      final existing = state.messages;
      final existingIds = existing.map((m) => m.id).toSet();
      final newMessages =
          response.messages.where((m) => !existingIds.contains(m.id)).toList();
      state = state.copyWith(
        messages: [...existing, ...newMessages],
        isLoadingMore: false,
        hasMore: response.hasMore,
        imageStatus: response.imageStatus,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
    }
  }

  /// Optimistic send: add to local state, call API, update on result.
  Future<void> sendMessage({
    required String senderId,
    String? content,
    String? imageUrl,
    String? encryptedContent,
  }) async {
    final optimistic = _repository.optimisticSend(
      matchId: matchId,
      senderId: senderId,
      content: content,
      imageUrl: imageUrl,
      encryptedContent: encryptedContent,
    );

    state = state.copyWith(
      messages: _repository.getCachedMessages(matchId),
    );

    try {
      final confirmed = await _repository.sendMessage(
        matchId,
        content: content,
        imageUrl: imageUrl,
        encryptedContent: encryptedContent,
      );
      _repository.confirmSend(matchId, optimistic.id, confirmed);
      state = state.copyWith(
        messages: _repository.getCachedMessages(matchId),
      );
    } catch (e) {
      _repository.failSend(matchId, optimistic.id);
      state = state.copyWith(
        messages: _repository.getCachedMessages(matchId),
      );
    }
  }

  /// Retry sending a failed message.
  Future<void> retrySend(String failedMessageId) async {
    final messages = state.messages;
    final failedMsg = messages.firstWhere(
      (m) => m.id == failedMessageId,
      orElse: () => throw StateError('Message not found'),
    );

    // Remove the failed message.
    final filtered = messages.where((m) => m.id != failedMessageId).toList();
    state = state.copyWith(messages: filtered);

    // Re-send.
    await sendMessage(
      senderId: failedMsg.senderId,
      content: failedMsg.content,
      imageUrl: failedMsg.imageUrl,
      encryptedContent: failedMsg.encryptedContent,
    );
  }

  /// Handle incoming WebSocket new_message event.
  void onNewMessage(Message message) {
    _repository.addIncomingMessage(matchId, message);
    state = state.copyWith(
      messages: _repository.getCachedMessages(matchId),
    );
  }

  /// Handle WebSocket message_delivered event.
  void onMessageDelivered(String messageId) {
    _repository.markDelivered(matchId, messageId);
    state = state.copyWith(
      messages: _repository.getCachedMessages(matchId),
    );
  }

  /// Handle WebSocket message_read event.
  void onMessageRead(String messageId) {
    _repository.markRead(matchId, messageId);
    state = state.copyWith(
      messages: _repository.getCachedMessages(matchId),
    );
  }

  /// Toggle image sharing.
  Future<void> toggleImages({required bool enable}) async {
    try {
      if (enable) {
        await _repository.enableImages(matchId);
      } else {
        await _repository.disableImages(matchId);
      }
      state = state.copyWith(
        imageStatus: _repository.getImageStatus(matchId),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Update image status from WebSocket event.
  void updateImageStatus(ImageStatus status) {
    _repository.updateImageStatus(matchId, status);
    state = state.copyWith(imageStatus: status);
  }
}

// ---------------------------------------------------------------------------
// Provider family (one notifier per conversation)
// ---------------------------------------------------------------------------

final conversationProvider = StateNotifierProvider.family<
    ConversationNotifier, ConversationState, String>(
  (ref, matchId) {
    final repository = ref.watch(chatRepositoryProvider);
    final notifier = ConversationNotifier(
      repository: repository,
      matchId: matchId,
    );
    notifier.loadMessages();
    return notifier;
  },
);
