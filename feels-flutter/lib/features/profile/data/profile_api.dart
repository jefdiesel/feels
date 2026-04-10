import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';

import '../../../core/api/endpoints.dart';
import '../domain/models/profile_models.dart';

/// Low-level HTTP calls for the profile endpoints.
class ProfileApi {
  final Dio _dio;

  ProfileApi(this._dio);

  // ---------------------------------------------------------------------------
  // Profile CRUD
  // ---------------------------------------------------------------------------

  /// GET /profile  ->  { profile, preferences, age }
  Future<ProfileResponse> getProfile() async {
    final response = await _dio.get(Endpoints.profile);
    return ProfileResponse.fromJson(response.data as Map<String, dynamic>);
  }

  /// POST /profile  ->  Profile
  Future<Profile> createProfile(Map<String, dynamic> data) async {
    final response = await _dio.post(Endpoints.profile, data: data);
    return Profile.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /profile  ->  Profile
  Future<Profile> updateProfile(Map<String, dynamic> data) async {
    final response = await _dio.put(Endpoints.profile, data: data);
    return Profile.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  /// GET /profile/preferences  ->  Preferences
  Future<Preferences> getPreferences() async {
    final response = await _dio.get(Endpoints.profilePreferences);
    return Preferences.fromJson(response.data as Map<String, dynamic>);
  }

  /// PUT /profile/preferences  ->  Preferences
  Future<Preferences> updatePreferences(Map<String, dynamic> data) async {
    final response = await _dio.put(Endpoints.profilePreferences, data: data);
    return Preferences.fromJson(response.data as Map<String, dynamic>);
  }

  // ---------------------------------------------------------------------------
  // Photos
  // ---------------------------------------------------------------------------

  /// POST /profile/photos  (multipart)  ->  Photo
  Future<Photo> uploadPhoto(String filePath) async {
    final fileName = filePath.split('/').last;
    final extension = fileName.split('.').last.toLowerCase();
    final mimeType = switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      'heic' || 'heif' => 'image/heic',
      _ => 'image/jpeg',
    };
    final parts = mimeType.split('/');

    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(
        filePath,
        filename: fileName,
        contentType: MediaType(parts[0], parts[1]),
      ),
    });
    final response = await _dio.post(
      Endpoints.profilePhotos,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return Photo.fromJson(response.data as Map<String, dynamic>);
  }

  /// DELETE /profile/photos/:id
  Future<void> deletePhoto(String photoId) async {
    await _dio.delete(Endpoints.profilePhoto(photoId));
  }

  /// PUT /profile/photos/reorder  { photo_ids: [...] }
  Future<void> reorderPhotos(List<String> photoIds) async {
    await _dio.put(Endpoints.profilePhotosReorder, data: {
      'photo_ids': photoIds,
    });
  }

  // ---------------------------------------------------------------------------
  // Verification, share, analytics
  // ---------------------------------------------------------------------------

  /// POST /profile/verify  ->  { verified: true }
  Future<bool> verify() async {
    final response = await _dio.post(Endpoints.profileVerify);
    return (response.data as Map<String, dynamic>)['verified'] as bool? ??
        false;
  }

  /// GET /profile/share-link  ->  ShareLink
  Future<ShareLink> getShareLink() async {
    final response = await _dio.get(Endpoints.profileShareLink);
    return ShareLink.fromJson(response.data as Map<String, dynamic>);
  }

  /// GET /profile/analytics  ->  ProfileAnalytics
  Future<ProfileAnalytics> getAnalytics() async {
    final response = await _dio.get(Endpoints.profileAnalytics);
    return ProfileAnalytics.fromJson(response.data as Map<String, dynamic>);
  }
}
