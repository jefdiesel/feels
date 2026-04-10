import 'package:dio/dio.dart';

import '../domain/models/feed_profile.dart';
import '../domain/models/swipe_action.dart';

/// Raw HTTP layer for the feed endpoints.
/// All methods throw [DioException] on failure — error handling lives
/// in [FeedRepository].
class FeedApi {
  final Dio _dio;

  FeedApi(this._dio);

  // ---------------------------------------------------------------------------
  // GET /feed?limit=N
  // ---------------------------------------------------------------------------

  Future<FeedApiResponse> getProfiles({int limit = 10}) async {
    final response = await _dio.get(
      '/feed',
      queryParameters: {'limit': limit},
    );
    final data = response.data as Map<String, dynamic>;
    final rawProfiles = data['profiles'] as List<dynamic>? ?? [];
    return FeedApiResponse(
      profiles: rawProfiles
          .map((e) => FeedProfile.fromJson(e as Map<String, dynamic>))
          .toList(),
      hasMore: data['has_more'] as bool? ?? false,
      queuedLikes: data['queued_likes'] as int? ?? 0,
      mustProcessAll: data['must_process_all'] as bool? ?? false,
    );
  }

  // ---------------------------------------------------------------------------
  // POST /feed/like/{id}
  // ---------------------------------------------------------------------------

  Future<SwipeResult> like(String targetId) async {
    final response = await _dio.post('/feed/like/$targetId');
    return SwipeResult.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // POST /feed/superlike/{id}
  // ---------------------------------------------------------------------------

  Future<SwipeResult> superlike(String targetId) async {
    final response = await _dio.post('/feed/superlike/$targetId');
    return SwipeResult.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // POST /feed/superlike/{id}/message
  // ---------------------------------------------------------------------------

  Future<SwipeResult> superlikeWithMessage(
    String targetId,
    String message,
  ) async {
    final response = await _dio.post(
      '/feed/superlike/$targetId/message',
      data: {'message': message},
    );
    return SwipeResult.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // POST /feed/pass/{id}
  // ---------------------------------------------------------------------------

  Future<void> pass(String targetId) async {
    await _dio.post('/feed/pass/$targetId');
  }

  // ---------------------------------------------------------------------------
  // POST /feed/rewind
  // ---------------------------------------------------------------------------

  Future<FeedProfile> rewind() async {
    final response = await _dio.post('/feed/rewind');
    return FeedProfile.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // GET /feed/daily-picks
  // ---------------------------------------------------------------------------

  Future<FeedApiResponse> getDailyPicks() async {
    final response = await _dio.get('/feed/daily-picks');
    final data = response.data as Map<String, dynamic>;
    final rawProfiles = data['profiles'] as List<dynamic>? ?? [];
    return FeedApiResponse(
      profiles: rawProfiles
          .map((e) => FeedProfile.fromJson(e as Map<String, dynamic>))
          .toList(),
      hasMore: data['has_more'] as bool? ?? false,
      queuedLikes: 0,
      mustProcessAll: false,
    );
  }
}

// ---------------------------------------------------------------------------
// Response wrapper
// ---------------------------------------------------------------------------

class FeedApiResponse {
  final List<FeedProfile> profiles;
  final bool hasMore;
  final int queuedLikes;
  final bool mustProcessAll;

  const FeedApiResponse({
    required this.profiles,
    required this.hasMore,
    required this.queuedLikes,
    required this.mustProcessAll,
  });
}
