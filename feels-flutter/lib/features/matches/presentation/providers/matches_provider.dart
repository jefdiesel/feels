import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/api_client.dart';
import '../../data/matches_api.dart';
import '../../data/matches_repository.dart';
import '../../domain/models/match.dart';

// ---------------------------------------------------------------------------
// Dependency providers (override these in app setup with actual Dio instance)
// ---------------------------------------------------------------------------

final matchesApiProvider = Provider<MatchesApi>((ref) {
  return MatchesApi(dio: ref.read(apiClientProvider));
});

/// Provide a MatchesRepository singleton.
final matchesRepositoryProvider = Provider<MatchesRepository>((ref) {
  return MatchesRepository(api: ref.watch(matchesApiProvider));
});

// ---------------------------------------------------------------------------
// Matches state
// ---------------------------------------------------------------------------

class MatchesState {
  final List<MatchWithProfile> matches;
  final bool isLoading;
  final String? error;

  const MatchesState({
    this.matches = const [],
    this.isLoading = false,
    this.error,
  });

  MatchesState copyWith({
    List<MatchWithProfile>? matches,
    bool? isLoading,
    String? error,
  }) {
    return MatchesState(
      matches: matches ?? this.matches,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

// ---------------------------------------------------------------------------
// Matches notifier
// ---------------------------------------------------------------------------

class MatchesNotifier extends StateNotifier<MatchesState> {
  final MatchesRepository _repository;

  MatchesNotifier({required MatchesRepository repository})
      : _repository = repository,
        super(const MatchesState());

  /// Initial fetch of all matches.
  Future<void> loadMatches() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final matches = await _repository.getMatches();
      state = state.copyWith(matches: matches, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Refresh matches (pull-to-refresh).
  Future<void> refresh() => loadMatches();

  /// Handle a WebSocket match_created event: fetch the full match and prepend.
  Future<void> onMatchCreated(String matchId) async {
    try {
      final match = await _repository.getMatch(matchId);
      final updated = [match, ...state.matches.where((m) => m.id != matchId)];
      state = state.copyWith(matches: updated);
    } catch (_) {
      // Fallback: full reload.
      await loadMatches();
    }
  }

  /// Handle a WebSocket match_deleted event.
  void onMatchDeleted(String matchId) {
    _repository.removeCached(matchId);
    state = state.copyWith(
      matches: state.matches.where((m) => m.id != matchId).toList(),
    );
  }

  /// Update a match in the list after a new message (for last_message preview).
  void updateMatchLastMessage(
    String matchId, {
    required String content,
    required String senderId,
    required DateTime createdAt,
    int? unreadIncrement,
  }) {
    final index = state.matches.indexWhere((m) => m.id == matchId);
    if (index == -1) return;

    final match = state.matches[index];
    final updated = match.copyWith(
      lastMessage: LastMessage(
        content: content,
        senderId: senderId,
        createdAt: createdAt,
      ),
      unreadCount: unreadIncrement != null
          ? match.unreadCount + unreadIncrement
          : match.unreadCount,
    );

    _repository.updateCached(matchId, updated);

    // Re-sort by recency.
    final matches = List<MatchWithProfile>.from(state.matches);
    matches[index] = updated;
    matches.sort((a, b) => b.sortTime.compareTo(a.sortTime));
    state = state.copyWith(matches: matches);
  }

  /// Clear unread count for a match (when user opens conversation).
  void clearUnread(String matchId) {
    final index = state.matches.indexWhere((m) => m.id == matchId);
    if (index == -1) return;

    final updated = state.matches[index].copyWith(unreadCount: 0);
    _repository.updateCached(matchId, updated);

    final matches = List<MatchWithProfile>.from(state.matches);
    matches[index] = updated;
    state = state.copyWith(matches: matches);
  }

  /// Unmatch: remove from server and local state.
  Future<void> unmatch(String matchId) async {
    try {
      await _repository.unmatch(matchId);
      state = state.copyWith(
        matches: state.matches.where((m) => m.id != matchId).toList(),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final matchesProvider =
    StateNotifierProvider<MatchesNotifier, MatchesState>((ref) {
  final repository = ref.watch(matchesRepositoryProvider);
  final notifier = MatchesNotifier(repository: repository);
  // Auto-load on first access.
  notifier.loadMatches();
  return notifier;
});
