import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/models/credit_balance.dart';
import '../../data/credits_api.dart';

/// Manages the user's credit balance with auto-refresh.
///
/// Exposes [CreditBalance] which includes daily_likes_remaining, bonus_likes,
/// and has_subscription. Auto-refreshes every 60 seconds while active.
class CreditsNotifier extends AsyncNotifier<CreditBalance> {
  Timer? _refreshTimer;

  static const _refreshInterval = Duration(seconds: 60);

  @override
  Future<CreditBalance> build() async {
    // Cancel timer when provider is disposed.
    ref.onDispose(() => _refreshTimer?.cancel());

    _startAutoRefresh();
    return _fetch();
  }

  Future<CreditBalance> _fetch() async {
    final api = ref.read(creditsApiProvider);
    return api.getCredits();
  }

  void _startAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(_refreshInterval, (_) {
      _silentRefresh();
    });
  }

  /// Refresh without triggering loading state — keeps current data visible
  /// while fetching updated balance in the background.
  Future<void> _silentRefresh() async {
    try {
      final fresh = await _fetch();
      state = AsyncData(fresh);
    } catch (_) {
      // Silently ignore — stale data is better than an error flash.
    }
  }

  /// Force an immediate refresh (e.g. after a swipe or purchase).
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Optimistically decrement daily likes after a swipe.
  void decrementDailyLike() {
    final current = state.valueOrNull;
    if (current == null) return;

    state = AsyncData(CreditBalance(
      balance: current.balance,
      bonusLikes: current.bonusLikes,
      dailyLikesUsed: current.dailyLikesUsed + 1,
      dailyLikesLimit: current.dailyLikesLimit,
      premiumLikesUsed: current.premiumLikesUsed,
      premiumLikesLimit: current.premiumLikesLimit,
      boostsUsed: current.boostsUsed,
      boostsLimit: current.boostsLimit,
      hasSubscription: current.hasSubscription,
    ));
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final creditsProvider =
    AsyncNotifierProvider<CreditsNotifier, CreditBalance>(CreditsNotifier.new);

/// Convenience selectors to avoid unnecessary rebuilds.

final dailyLikesRemainingProvider = Provider<int>((ref) {
  return ref.watch(creditsProvider).valueOrNull?.dailyLikesRemaining ?? 0;
});

final bonusLikesProvider = Provider<int>((ref) {
  return ref.watch(creditsProvider).valueOrNull?.bonusLikes ?? 0;
});

final hasSubscriptionProvider = Provider<bool>((ref) {
  return ref.watch(creditsProvider).valueOrNull?.hasSubscription ?? false;
});

final totalLikesRemainingProvider = Provider<int>((ref) {
  return ref.watch(creditsProvider).valueOrNull?.totalLikesRemaining ?? 0;
});
