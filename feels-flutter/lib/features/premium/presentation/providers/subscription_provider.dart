import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/models/subscription.dart';
import '../../data/credits_api.dart';
import '../../data/premium_api.dart';

/// Manages the user's subscription state.
///
/// Fetches from /subscription on init. Exposes current plan, expiry,
/// and active status. Supports cancel + refresh after purchase.
class SubscriptionNotifier extends AsyncNotifier<SubscriptionState> {
  @override
  Future<SubscriptionState> build() async {
    return _fetch();
  }

  Future<SubscriptionState> _fetch() async {
    final creditsApi = ref.read(creditsApiProvider);
    final premiumApi = ref.read(premiumApiProvider);

    // Fetch both endpoints in parallel.
    final results = await Future.wait([
      creditsApi.getSubscription(),
      premiumApi.getSubscription(),
    ]);

    final creditsSubscription = results[0];
    final paymentsSubscription = results[1];

    // Prefer payments subscription (more detailed), fall back to credits.
    final sub = paymentsSubscription ?? creditsSubscription;

    return SubscriptionState(
      subscription: sub,
      isActive: sub?.active ?? false,
    );
  }

  /// Force refresh after a purchase or cancellation.
  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  /// Cancel the current subscription.
  Future<void> cancel() async {
    final api = ref.read(premiumApiProvider);
    await api.cancelSubscription();
    await refresh();
  }

  /// Create a checkout session for the given plan.
  Future<CheckoutResponse> createCheckout({
    required String planType,
    required String successUrl,
    required String cancelUrl,
  }) async {
    final api = ref.read(premiumApiProvider);
    return api.createCheckout(
      planType: planType,
      successUrl: successUrl,
      cancelUrl: cancelUrl,
    );
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

class SubscriptionState {
  final Subscription? subscription;
  final bool isActive;

  const SubscriptionState({
    this.subscription,
    this.isActive = false,
  });
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final subscriptionProvider =
    AsyncNotifierProvider<SubscriptionNotifier, SubscriptionState>(
  SubscriptionNotifier.new,
);

/// Convenience selector: is the user currently a premium subscriber?
final isPremiumProvider = Provider<bool>((ref) {
  return ref.watch(subscriptionProvider).valueOrNull?.isActive ?? false;
});

/// Convenience selector: current plan name (e.g. "quarterly").
final currentPlanProvider = Provider<String?>((ref) {
  return ref.watch(subscriptionProvider).valueOrNull?.subscription?.plan;
});
