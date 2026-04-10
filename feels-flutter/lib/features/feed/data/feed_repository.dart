import 'package:dio/dio.dart';

import '../domain/models/feed_profile.dart';
import '../domain/models/swipe_action.dart';
import 'feed_api.dart';

/// Repository wrapping [FeedApi] with structured error handling.
///
/// Every public method returns a [FeedResult] that is either a value or an
/// error — callers never need to catch raw [DioException].
class FeedRepository {
  final FeedApi _api;

  FeedRepository(this._api);

  // ---------------------------------------------------------------------------
  // Profiles
  // ---------------------------------------------------------------------------

  Future<FeedResult<FeedApiResponse>> getProfiles({int limit = 10}) async {
    return _guard(() => _api.getProfiles(limit: limit));
  }

  Future<FeedResult<FeedApiResponse>> getDailyPicks() async {
    return _guard(() => _api.getDailyPicks());
  }

  // ---------------------------------------------------------------------------
  // Swipe actions
  // ---------------------------------------------------------------------------

  Future<FeedResult<SwipeResult>> like(String targetId) async {
    return _guard(() => _api.like(targetId));
  }

  Future<FeedResult<SwipeResult>> superlike(String targetId) async {
    return _guard(() => _api.superlike(targetId));
  }

  Future<FeedResult<SwipeResult>> superlikeWithMessage(
    String targetId,
    String message,
  ) async {
    return _guard(() => _api.superlikeWithMessage(targetId, message));
  }

  Future<FeedResult<void>> pass(String targetId) async {
    return _guard(() => _api.pass(targetId));
  }

  Future<FeedResult<FeedProfile>> rewind() async {
    return _guard(() => _api.rewind());
  }

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  Future<FeedResult<T>> _guard<T>(Future<T> Function() fn) async {
    try {
      final value = await fn();
      return FeedResult.success(value);
    } on DioException catch (e) {
      return FeedResult.failure(_mapDioError(e));
    } catch (e) {
      return FeedResult.failure(
        FeedError(
          type: FeedErrorType.unknown,
          message: e.toString(),
        ),
      );
    }
  }

  FeedError _mapDioError(DioException e) {
    final statusCode = e.response?.statusCode;
    final serverMessage = _extractServerMessage(e);

    switch (statusCode) {
      case 400:
        return FeedError(
          type: FeedErrorType.badRequest,
          message: serverMessage ?? 'Invalid request',
          statusCode: 400,
        );
      case 401:
        return FeedError(
          type: FeedErrorType.unauthorized,
          message: 'Session expired',
          statusCode: 401,
        );
      case 402:
        return FeedError(
          type: FeedErrorType.paymentRequired,
          message: serverMessage ?? 'Premium required',
          statusCode: 402,
        );
      case 409:
        return FeedError(
          type: FeedErrorType.conflict,
          message: serverMessage ?? 'Already processed',
          statusCode: 409,
        );
      case 411:
        return FeedError(
          type: FeedErrorType.profileRequired,
          message: 'Complete your profile first',
          statusCode: 411,
        );
      case 429:
        return FeedError(
          type: FeedErrorType.rateLimited,
          message: 'Slow down — try again in a moment',
          statusCode: 429,
        );
      default:
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.sendTimeout) {
          return FeedError(
            type: FeedErrorType.timeout,
            message: 'Connection timed out',
          );
        }
        if (e.type == DioExceptionType.connectionError) {
          return FeedError(
            type: FeedErrorType.network,
            message: 'No internet connection',
          );
        }
        return FeedError(
          type: FeedErrorType.server,
          message: serverMessage ?? 'Something went wrong',
          statusCode: statusCode,
        );
    }
  }

  String? _extractServerMessage(DioException e) {
    try {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        return data['error'] as String?;
      }
    } catch (_) {}
    return null;
  }
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

class FeedResult<T> {
  final T? data;
  final FeedError? error;

  const FeedResult._({this.data, this.error});

  factory FeedResult.success(T data) => FeedResult._(data: data);
  factory FeedResult.failure(FeedError error) => FeedResult._(error: error);

  bool get isSuccess => error == null;
  bool get isFailure => error != null;

  /// Unwrap with a fallback.
  T get value {
    if (data != null) return data as T;
    throw StateError('Attempted to access value of failed FeedResult: $error');
  }
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

enum FeedErrorType {
  badRequest,
  unauthorized,
  paymentRequired,
  conflict,
  profileRequired,
  rateLimited,
  timeout,
  network,
  server,
  unknown,
}

class FeedError {
  final FeedErrorType type;
  final String message;
  final int? statusCode;

  const FeedError({
    required this.type,
    required this.message,
    this.statusCode,
  });

  bool get isPremiumRequired => type == FeedErrorType.paymentRequired;
  bool get isNetworkError =>
      type == FeedErrorType.network || type == FeedErrorType.timeout;

  @override
  String toString() => 'FeedError($type, $statusCode: $message)';
}
