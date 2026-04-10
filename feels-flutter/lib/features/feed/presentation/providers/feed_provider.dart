import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/api_client.dart';
import '../../data/feed_api.dart';
import '../../data/feed_repository.dart';
import '../../domain/models/feed_profile.dart';
import '../../domain/models/swipe_action.dart';

// ---------------------------------------------------------------------------
// Feed state
// ---------------------------------------------------------------------------

class FeedState {
  final List<FeedProfile> profiles;
  final int currentIndex;
  final bool isLoading;
  final bool hasMore;
  final String? error;
  final SwipeResult? lastSwipeResult;
  final FeedProfile? lastSwipedProfile;

  const FeedState({
    this.profiles = const [],
    this.currentIndex = 0,
    this.isLoading = false,
    this.hasMore = true,
    this.error,
    this.lastSwipeResult,
    this.lastSwipedProfile,
  });

  /// Profiles remaining in the stack (from currentIndex onward).
  List<FeedProfile> get remaining =>
      currentIndex < profiles.length ? profiles.sublist(currentIndex) : [];

  /// Number of cards left.
  int get remainingCount => profiles.length - currentIndex;

  /// Current top card, or null if empty.
  FeedProfile? get topProfile =>
      currentIndex < profiles.length ? profiles[currentIndex] : null;

  bool get isEmpty => remainingCount <= 0 && !isLoading;

  FeedState copyWith({
    List<FeedProfile>? profiles,
    int? currentIndex,
    bool? isLoading,
    bool? hasMore,
    String? error,
    SwipeResult? lastSwipeResult,
    FeedProfile? lastSwipedProfile,
    bool clearError = false,
    bool clearLastSwipe = false,
  }) {
    return FeedState(
      profiles: profiles ?? this.profiles,
      currentIndex: currentIndex ?? this.currentIndex,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      error: clearError ? null : (error ?? this.error),
      lastSwipeResult:
          clearLastSwipe ? null : (lastSwipeResult ?? this.lastSwipeResult),
      lastSwipedProfile:
          clearLastSwipe ? null : (lastSwipedProfile ?? this.lastSwipedProfile),
    );
  }
}

// ---------------------------------------------------------------------------
// Feed notifier
// ---------------------------------------------------------------------------

class FeedNotifier extends AsyncNotifier<FeedState> {
  late final FeedRepository _repo;

  static const _preloadThreshold = 2;
  static const _batchSize = 10;

  @override
  Future<FeedState> build() async {
    _repo = ref.read(feedRepositoryProvider);
    return _loadInitial();
  }

  Future<FeedState> _loadInitial() async {
    final result = await _repo.getProfiles(limit: _batchSize);
    if (result.isFailure) {
      return FeedState(error: result.error!.message);
    }
    final resp = result.value;
    return FeedState(
      profiles: resp.profiles,
      hasMore: resp.hasMore,
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /// Reload the feed from scratch.
  Future<void> loadProfiles() async {
    state = const AsyncValue.loading();
    state = AsyncValue.data(await _loadInitial());
  }

  /// Process a swipe action on the current top card.
  Future<void> swipe(SwipeAction action) async {
    final current = state.valueOrNull;
    if (current == null || current.topProfile == null) return;

    final profile = current.topProfile!;

    // Optimistically advance the index immediately so UI feels instant.
    state = AsyncValue.data(
      current.copyWith(
        currentIndex: current.currentIndex + 1,
        lastSwipedProfile: profile,
        clearError: true,
      ),
    );

    // Fire-and-forget the network call — but capture the result.
    late final dynamic result;
    switch (action) {
      case SwipeAction.like:
        result = await _repo.like(profile.userId);
        break;
      case SwipeAction.pass:
        result = await _repo.pass(profile.userId);
        break;
      case SwipeAction.superlike:
        result = await _repo.superlike(profile.userId);
        break;
    }

    // Update state with swipe result (for match animation, premium gate, etc.).
    final updated = state.valueOrNull;
    if (updated != null) {
      if (result is FeedResult<SwipeResult> && result.isSuccess) {
        state = AsyncValue.data(
          updated.copyWith(lastSwipeResult: result.data),
        );
      } else if (result is FeedResult && result.isFailure) {
        final err = result.error!;
        if (err.isPremiumRequired) {
          state = AsyncValue.data(
            updated.copyWith(
              error: err.message,
              lastSwipeResult: SwipeResult(
                matched: false,
                requiresPremium: true,
                premiumReason: err.message,
              ),
            ),
          );
        }
      }
    }

    // Preload more cards when running low.
    _maybePreload();
  }

  /// Superlike with an attached message.
  Future<void> superlikeWithMessage(String message) async {
    final current = state.valueOrNull;
    if (current == null || current.topProfile == null) return;

    final profile = current.topProfile!;

    state = AsyncValue.data(
      current.copyWith(
        currentIndex: current.currentIndex + 1,
        lastSwipedProfile: profile,
        clearError: true,
      ),
    );

    final result =
        await _repo.superlikeWithMessage(profile.userId, message);

    final updated = state.valueOrNull;
    if (updated != null && result.isSuccess) {
      state = AsyncValue.data(
        updated.copyWith(lastSwipeResult: result.data),
      );
    }

    _maybePreload();
  }

  /// Rewind the last swipe (premium feature).
  Future<void> rewind() async {
    final current = state.valueOrNull;
    if (current == null) return;

    final result = await _repo.rewind();
    if (result.isSuccess) {
      final profile = result.value;
      final newProfiles = List<FeedProfile>.from(current.profiles);
      // Insert at current position (before the current top card).
      final insertIdx =
          current.currentIndex > 0 ? current.currentIndex - 1 : 0;
      newProfiles.insert(insertIdx, profile);
      state = AsyncValue.data(
        current.copyWith(
          profiles: newProfiles,
          currentIndex: insertIdx,
          clearLastSwipe: true,
          clearError: true,
        ),
      );
    } else {
      state = AsyncValue.data(
        current.copyWith(error: result.error!.message),
      );
    }
  }

  /// Clear the match overlay / last swipe result.
  void clearLastSwipe() {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncValue.data(current.copyWith(clearLastSwipe: true));
  }

  /// Clear error state.
  void clearError() {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncValue.data(current.copyWith(clearError: true));
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  Future<void> _maybePreload() async {
    final current = state.valueOrNull;
    if (current == null) return;
    if (current.isLoading || !current.hasMore) return;
    if (current.remainingCount > _preloadThreshold) return;

    state = AsyncValue.data(current.copyWith(isLoading: true));

    final result = await _repo.getProfiles(limit: _batchSize);
    final updated = state.valueOrNull;
    if (updated == null) return;

    if (result.isSuccess) {
      final resp = result.value;
      // Deduplicate — server may return profiles already in the stack.
      final existingIds =
          updated.profiles.map((p) => p.userId).toSet();
      final newProfiles = resp.profiles
          .where((p) => !existingIds.contains(p.userId))
          .toList();

      state = AsyncValue.data(
        updated.copyWith(
          profiles: [...updated.profiles, ...newProfiles],
          hasMore: resp.hasMore,
          isLoading: false,
        ),
      );
    } else {
      state = AsyncValue.data(
        updated.copyWith(isLoading: false),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final feedApiProvider = Provider<FeedApi>((ref) {
  return FeedApi(ref.read(apiClientProvider));
});

final feedRepositoryProvider = Provider<FeedRepository>((ref) {
  return FeedRepository(ref.read(feedApiProvider));
});

final feedProvider =
    AsyncNotifierProvider<FeedNotifier, FeedState>(FeedNotifier.new);
