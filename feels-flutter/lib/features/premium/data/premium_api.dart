import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../shared/models/subscription.dart';

/// Raw HTTP layer for payments/premium endpoints.
/// All methods throw [DioException] on failure.
class PremiumApi {
  final Dio _dio;

  PremiumApi(this._dio);

  // ---------------------------------------------------------------------------
  // GET /payments/plans
  // ---------------------------------------------------------------------------

  Future<List<Plan>> getPlans() async {
    final response = await _dio.get(Endpoints.paymentsPlans);
    final data = response.data as List<dynamic>;
    return data
        .map((e) => Plan.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ---------------------------------------------------------------------------
  // POST /payments/checkout
  // ---------------------------------------------------------------------------

  Future<CheckoutResponse> createCheckout({
    required String planType,
    required String successUrl,
    required String cancelUrl,
  }) async {
    final response = await _dio.post(
      Endpoints.paymentsCheckout,
      data: {
        'plan_type': planType,
        'success_url': successUrl,
        'cancel_url': cancelUrl,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return CheckoutResponse(
      checkoutUrl: data['checkout_url'] as String,
      sessionId: data['session_id'] as String,
    );
  }

  // ---------------------------------------------------------------------------
  // GET /payments/subscription
  // ---------------------------------------------------------------------------

  Future<Subscription?> getSubscription() async {
    final response = await _dio.get(Endpoints.paymentsSubscription);
    final data = response.data as Map<String, dynamic>;
    final sub = data['subscription'];
    if (sub == null) return null;
    return Subscription.fromJson(sub as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // DELETE /payments/subscription
  // ---------------------------------------------------------------------------

  Future<void> cancelSubscription() async {
    await _dio.delete(Endpoints.paymentsSubscription);
  }

  // ---------------------------------------------------------------------------
  // POST /payments/portal
  // ---------------------------------------------------------------------------

  Future<String> createPortalSession({required String returnUrl}) async {
    final response = await _dio.post(
      Endpoints.paymentsPortal,
      data: {'return_url': returnUrl},
    );
    final data = response.data as Map<String, dynamic>;
    return data['url'] as String;
  }
}

// ---------------------------------------------------------------------------
// Response models
// ---------------------------------------------------------------------------

class CheckoutResponse {
  final String checkoutUrl;
  final String sessionId;

  const CheckoutResponse({
    required this.checkoutUrl,
    required this.sessionId,
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final premiumApiProvider = Provider<PremiumApi>((ref) {
  final dio = ref.read(apiClientProvider);
  return PremiumApi(dio);
});
