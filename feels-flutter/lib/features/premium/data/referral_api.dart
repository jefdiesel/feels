import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/endpoints.dart';

/// Raw HTTP layer for referral endpoints.
/// All methods throw [DioException] on failure.
class ReferralApi {
  final Dio _dio;

  ReferralApi(this._dio);

  // ---------------------------------------------------------------------------
  // GET /referral/code
  // ---------------------------------------------------------------------------

  Future<ReferralCode> getCode() async {
    final response = await _dio.get(Endpoints.referralCode);
    return ReferralCode.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // POST /referral/redeem
  // ---------------------------------------------------------------------------

  Future<ReferralRedeemResult> redeemCode(String code) async {
    final response = await _dio.post(
      Endpoints.referralRedeem,
      data: {'code': code},
    );
    final data = response.data as Map<String, dynamic>;
    return ReferralRedeemResult(
      success: data['success'] as bool,
      message: data['message'] as String,
    );
  }

  // ---------------------------------------------------------------------------
  // GET /referral/stats
  // ---------------------------------------------------------------------------

  Future<ReferralStats> getStats() async {
    final response = await _dio.get(Endpoints.referralStats);
    return ReferralStats.fromJson(response.data as Map<String, dynamic>);
  }
}

// ---------------------------------------------------------------------------
// Response models
// ---------------------------------------------------------------------------

class ReferralCode {
  final String id;
  final String userId;
  final String code;
  final DateTime createdAt;

  const ReferralCode({
    required this.id,
    required this.userId,
    required this.code,
    required this.createdAt,
  });

  factory ReferralCode.fromJson(Map<String, dynamic> json) {
    return ReferralCode(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      code: json['code'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class ReferralRedeemResult {
  final bool success;
  final String message;

  const ReferralRedeemResult({
    required this.success,
    required this.message,
  });
}

class ReferralStats {
  final String code;
  final int totalReferrals;
  final int premiumDaysEarned;

  const ReferralStats({
    required this.code,
    required this.totalReferrals,
    required this.premiumDaysEarned,
  });

  factory ReferralStats.fromJson(Map<String, dynamic> json) {
    return ReferralStats(
      code: json['code'] as String,
      totalReferrals: json['total_referrals'] as int? ?? 0,
      premiumDaysEarned: json['premium_days_earned'] as int? ?? 0,
    );
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final referralApiProvider = Provider<ReferralApi>((ref) {
  final dio = ref.read(apiClientProvider);
  return ReferralApi(dio);
});
