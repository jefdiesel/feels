import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/api_client.dart';
import '../../data/profile_api.dart';
import '../../data/profile_repository.dart';
import '../../domain/models/profile_models.dart';

// ---------------------------------------------------------------------------
// DI providers
// ---------------------------------------------------------------------------

final profileApiProvider = Provider<ProfileApi>((ref) {
  final dio = ref.read(apiClientProvider);
  return ProfileApi(dio);
});

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  final api = ref.read(profileApiProvider);
  return ProfileRepository(api);
});

// ---------------------------------------------------------------------------
// Profile state
// ---------------------------------------------------------------------------

class ProfileState {
  final Profile? profile;
  final Preferences? preferences;
  final int? age;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  /// When true the photo grid is in swap-reorder mode.
  final bool isReorderMode;

  /// Index of first selected photo during reorder (0-based display index).
  final int? reorderFirstIndex;

  const ProfileState({
    this.profile,
    this.preferences,
    this.age,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
    this.isReorderMode = false,
    this.reorderFirstIndex,
  });

  bool get hasProfile => profile != null;

  List<Photo> get sortedPhotos {
    if (profile == null) return [];
    final list = List<Photo>.from(profile!.photos);
    list.sort((a, b) => a.position.compareTo(b.position));
    return list;
  }

  ProfileState copyWith({
    Profile? profile,
    Preferences? preferences,
    int? age,
    bool? isLoading,
    bool? isSaving,
    String? error,
    bool clearError = false,
    bool? isReorderMode,
    int? reorderFirstIndex,
    bool clearReorderFirst = false,
  }) {
    return ProfileState(
      profile: profile ?? this.profile,
      preferences: preferences ?? this.preferences,
      age: age ?? this.age,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
      isReorderMode: isReorderMode ?? this.isReorderMode,
      reorderFirstIndex:
          clearReorderFirst ? null : (reorderFirstIndex ?? this.reorderFirstIndex),
    );
  }
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

class ProfileNotifier extends StateNotifier<ProfileState> {
  final ProfileRepository _repo;

  ProfileNotifier(this._repo) : super(const ProfileState());

  // ---- Load ---------------------------------------------------------------

  Future<void> loadProfile({bool forceRefresh = false}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _repo.getProfile(forceRefresh: forceRefresh);
      state = state.copyWith(
        profile: response.profile,
        preferences: response.preferences,
        age: response.age,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: ProfileRepository.extractError(e),
      );
    }
  }

  // ---- Create profile -----------------------------------------------------

  Future<void> createProfile({
    required String name,
    required String dob,
    required String gender,
    String bio = '',
    String zipCode = '10001',
  }) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final created = await _repo.createProfile({
        'name': name,
        'dob': dob,
        'gender': gender,
        'bio': bio,
        'zip_code': zipCode,
      });
      state = state.copyWith(
        profile: created,
        isSaving: false,
      );
      // Reload full profile with preferences
      await loadProfile(forceRefresh: true);
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
      rethrow;
    }
  }

  // ---- Update profile -----------------------------------------------------

  Future<void> updateProfile(Map<String, dynamic> data) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final updated = await _repo.updateProfile(data);
      state = state.copyWith(
        profile: updated,
        isSaving: false,
      );
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
    }
  }

  // ---- Preferences --------------------------------------------------------

  Future<void> updatePreferences(Map<String, dynamic> data) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final updated = await _repo.updatePreferences(data);
      state = state.copyWith(
        preferences: updated,
        isSaving: false,
      );
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
    }
  }

  // ---- Photos -------------------------------------------------------------

  Future<void> uploadPhoto(String filePath) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await _repo.uploadPhoto(filePath);
      // Reload profile to get updated photo list with correct positions.
      await loadProfile(forceRefresh: true);
      state = state.copyWith(isSaving: false);
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
    }
  }

  Future<void> deletePhoto(String photoId) async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await _repo.deletePhoto(photoId);
      await loadProfile(forceRefresh: true);
      state = state.copyWith(isSaving: false);
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
    }
  }

  // ---- Reorder mode -------------------------------------------------------

  void toggleReorderMode() {
    state = state.copyWith(
      isReorderMode: !state.isReorderMode,
      clearReorderFirst: true,
    );
  }

  void exitReorderMode() {
    state = state.copyWith(isReorderMode: false, clearReorderFirst: true);
  }

  /// Handle a tap on a photo slot during reorder mode.
  /// If no photo is selected yet, select it. If one is already selected,
  /// swap the two and send to server.
  Future<void> onReorderTap(int displayIndex) async {
    final photos = state.sortedPhotos;
    if (displayIndex >= photos.length) return;

    if (state.reorderFirstIndex == null) {
      state = state.copyWith(reorderFirstIndex: displayIndex);
      return;
    }

    final firstIdx = state.reorderFirstIndex!;
    if (firstIdx == displayIndex) {
      // Deselect
      state = state.copyWith(clearReorderFirst: true);
      return;
    }

    // Build new order: swap the two positions.
    final reordered = List<Photo>.from(photos);
    final temp = reordered[firstIdx];
    reordered[firstIdx] = reordered[displayIndex];
    reordered[displayIndex] = temp;

    final orderedIds = reordered.map((p) => p.id).toList();

    state = state.copyWith(isSaving: true, clearReorderFirst: true);
    try {
      await _repo.reorderPhotos(orderedIds);
      await loadProfile(forceRefresh: true);
      state = state.copyWith(isSaving: false);
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
    }
  }

  // ---- Verification -------------------------------------------------------

  Future<void> verify() async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      await _repo.verify();
      await loadProfile(forceRefresh: true);
      state = state.copyWith(isSaving: false);
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
    }
  }

  // ---- Utilities ----------------------------------------------------------

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

// ---------------------------------------------------------------------------
// Top-level provider
// ---------------------------------------------------------------------------

final profileProvider =
    StateNotifierProvider<ProfileNotifier, ProfileState>((ref) {
  final repo = ref.watch(profileRepositoryProvider);
  return ProfileNotifier(repo);
});
