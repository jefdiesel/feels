import 'package:dio/dio.dart';

import '../domain/models/match.dart';

class MatchesApi {
  final Dio _dio;

  MatchesApi({required Dio dio}) : _dio = dio;

  /// Fetch all matches for the current user.
  Future<List<MatchWithProfile>> getMatches() async {
    final response = await _dio.get('/matches');
    final data = response.data as List<dynamic>;
    return data
        .map((e) => MatchWithProfile.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Fetch a single match by ID.
  Future<MatchWithProfile> getMatch(String id) async {
    final response = await _dio.get('/matches/$id');
    return MatchWithProfile.fromJson(response.data as Map<String, dynamic>);
  }

  /// Unmatch (delete) a match.
  Future<void> unmatch(String id) async {
    await _dio.delete('/matches/$id');
  }
}
