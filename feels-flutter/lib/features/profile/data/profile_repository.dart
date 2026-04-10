import 'package:dio/dio.dart';

import '../domain/models/profile_models.dart';
import 'profile_api.dart';

/// Repository wrapping [ProfileApi] with caching and error extraction.
class ProfileRepository {
  final ProfileApi _api;

  ProfileRepository(this._api);

  // In-memory cache for the current session.
  ProfileResponse? _cached;

  ProfileResponse? get cached => _cached;

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  /// Fetch own profile (with preferences + age). Caches result.
  Future<ProfileResponse> getProfile({bool forceRefresh = false}) async {
    if (!forceRefresh && _cached != null) return _cached!;
    _cached = await _api.getProfile();
    return _cached!;
  }

  /// Create profile during onboarding.
  Future<Profile> createProfile(Map<String, dynamic> data) async {
    final profile = await _api.createProfile(data);
    _cached = null; // bust cache
    return profile;
  }

  /// Update profile fields. Busts cache.
  Future<Profile> updateProfile(Map<String, dynamic> data) async {
    final profile = await _api.updateProfile(data);
    _cached = null;
    return profile;
  }

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  Future<Preferences> getPreferences() => _api.getPreferences();

  Future<Preferences> updatePreferences(Map<String, dynamic> data) async {
    final prefs = await _api.updatePreferences(data);
    _cached = null;
    return prefs;
  }

  // ---------------------------------------------------------------------------
  // Photos
  // ---------------------------------------------------------------------------

  Future<Photo> uploadPhoto(String filePath) async {
    final photo = await _api.uploadPhoto(filePath);
    _cached = null;
    return photo;
  }

  Future<void> deletePhoto(String photoId) async {
    await _api.deletePhoto(photoId);
    _cached = null;
  }

  Future<void> reorderPhotos(List<String> photoIds) async {
    await _api.reorderPhotos(photoIds);
    _cached = null;
  }

  // ---------------------------------------------------------------------------
  // Verification, share, analytics
  // ---------------------------------------------------------------------------

  Future<bool> verify() => _api.verify();

  Future<ShareLink> getShareLink() => _api.getShareLink();

  Future<ProfileAnalytics> getAnalytics() => _api.getAnalytics();

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  void clearCache() => _cached = null;

  /// Extract a human-readable error message from a Dio exception.
  static String extractError(dynamic e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map<String, dynamic> && data.containsKey('error')) {
        return data['error'] as String;
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return 'Connection timed out. Please try again.';
      }
      if (e.type == DioExceptionType.connectionError) {
        return 'No internet connection.';
      }
      return e.message ?? 'Something went wrong.';
    }
    return e.toString();
  }
}
