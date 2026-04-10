import '../domain/models/match.dart';
import 'matches_api.dart';

class MatchesRepository {
  final MatchesApi _api;

  /// Local cache of matches, keyed by match ID.
  final Map<String, MatchWithProfile> _cache = {};

  MatchesRepository({required MatchesApi api}) : _api = api;

  /// Fetch all matches, update cache, return sorted by recency.
  Future<List<MatchWithProfile>> getMatches() async {
    final matches = await _api.getMatches();
    _cache.clear();
    for (final match in matches) {
      _cache[match.id] = match;
    }
    return _sortedMatches();
  }

  /// Fetch a single match and update cache.
  Future<MatchWithProfile> getMatch(String id) async {
    final match = await _api.getMatch(id);
    _cache[id] = match;
    return match;
  }

  /// Unmatch and remove from cache.
  Future<void> unmatch(String id) async {
    await _api.unmatch(id);
    _cache.remove(id);
  }

  /// Get a cached match by ID (no network call).
  MatchWithProfile? getCached(String id) => _cache[id];

  /// Update a match in the local cache (e.g., from WebSocket events).
  void updateCached(String id, MatchWithProfile match) {
    _cache[id] = match;
  }

  /// Remove a match from the local cache.
  void removeCached(String id) {
    _cache.remove(id);
  }

  /// Return all cached matches sorted by most recent activity.
  List<MatchWithProfile> _sortedMatches() {
    final matches = _cache.values.toList();
    matches.sort((a, b) => b.sortTime.compareTo(a.sortTime));
    return matches;
  }

  /// Get current cached list sorted by recency.
  List<MatchWithProfile> get cachedMatches => _sortedMatches();
}
