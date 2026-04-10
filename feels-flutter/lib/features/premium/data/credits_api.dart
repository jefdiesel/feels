import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';
import '../../../shared/models/credit_balance.dart';
import '../../../shared/models/subscription.dart';

/// Raw HTTP layer for credits & subscription status endpoints.
/// All methods throw [DioException] on failure.
class CreditsApi {
  final Dio _dio;

  CreditsApi(this._dio);

  // ---------------------------------------------------------------------------
  // GET /credits
  // ---------------------------------------------------------------------------

  Future<CreditBalance> getCredits() async {
    final response = await _dio.get(Endpoints.credits);
    return CreditBalance.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // GET /subscription
  // ---------------------------------------------------------------------------

  Future<Subscription?> getSubscription() async {
    final response = await _dio.get(Endpoints.subscription);
    final data = response.data as Map<String, dynamic>;
    if (data['active'] == null) return null;
    return Subscription.fromJson(data);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final creditsApiProvider = Provider<CreditsApi>((ref) {
  final dio = ref.read(apiClientProvider);
  return CreditsApi(dio);
});
