import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../profile/data/profile_repository.dart';
import '../../../profile/presentation/providers/profile_provider.dart';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

class OnboardingState {
  final int currentStep;

  // Step 1 — photos (managed by profileProvider, tracked here by count)
  final int photoCount;

  // Step 2 — basics
  final String name;
  final DateTime? birthday;
  final String? gender;

  // Step 3 — personality
  final String bio;
  final String? promptQuestion;
  final String promptAnswer;

  // Step 4 — preferences
  final List<String> gendersSeeking;
  final double ageMin;
  final double ageMax;
  final double distanceMiles;

  // UX state
  final bool isSaving;
  final String? error;

  const OnboardingState({
    this.currentStep = 0,
    this.photoCount = 0,
    this.name = '',
    this.birthday,
    this.gender,
    this.bio = '',
    this.promptQuestion,
    this.promptAnswer = '',
    this.gendersSeeking = const [],
    this.ageMin = 18,
    this.ageMax = 40,
    this.distanceMiles = 25,
    this.isSaving = false,
    this.error,
  });

  // --- Step validation ---

  bool get isStep0Valid => photoCount >= 2;

  bool get isStep1Valid =>
      name.trim().isNotEmpty && birthday != null && gender != null && _is18Plus;

  bool get isStep2Valid => true; // bio & prompt are optional

  bool get isStep3Valid => gendersSeeking.isNotEmpty;

  bool get _is18Plus {
    if (birthday == null) return false;
    final now = DateTime.now();
    int age = now.year - birthday!.year;
    if (now.month < birthday!.month ||
        (now.month == birthday!.month && now.day < birthday!.day)) {
      age--;
    }
    return age >= 18;
  }

  int? get age {
    if (birthday == null) return null;
    final now = DateTime.now();
    int a = now.year - birthday!.year;
    if (now.month < birthday!.month ||
        (now.month == birthday!.month && now.day < birthday!.day)) {
      a--;
    }
    return a;
  }

  bool isStepValid(int step) => switch (step) {
        0 => isStep0Valid,
        1 => isStep1Valid,
        2 => isStep2Valid,
        3 => isStep3Valid,
        _ => false,
      };

  /// DOB formatted as YYYY-MM-DD for the API.
  String? get dobString {
    if (birthday == null) return null;
    final b = birthday!;
    return '${b.year.toString().padLeft(4, '0')}-'
        '${b.month.toString().padLeft(2, '0')}-'
        '${b.day.toString().padLeft(2, '0')}';
  }

  OnboardingState copyWith({
    int? currentStep,
    int? photoCount,
    String? name,
    DateTime? birthday,
    String? gender,
    String? bio,
    String? promptQuestion,
    String? promptAnswer,
    List<String>? gendersSeeking,
    double? ageMin,
    double? ageMax,
    double? distanceMiles,
    bool? isSaving,
    String? error,
    bool clearError = false,
    bool clearBirthday = false,
    bool clearGender = false,
    bool clearPromptQuestion = false,
  }) {
    return OnboardingState(
      currentStep: currentStep ?? this.currentStep,
      photoCount: photoCount ?? this.photoCount,
      name: name ?? this.name,
      birthday: clearBirthday ? null : (birthday ?? this.birthday),
      gender: clearGender ? null : (gender ?? this.gender),
      bio: bio ?? this.bio,
      promptQuestion: clearPromptQuestion
          ? null
          : (promptQuestion ?? this.promptQuestion),
      promptAnswer: promptAnswer ?? this.promptAnswer,
      gendersSeeking: gendersSeeking ?? this.gendersSeeking,
      ageMin: ageMin ?? this.ageMin,
      ageMax: ageMax ?? this.ageMax,
      distanceMiles: distanceMiles ?? this.distanceMiles,
      isSaving: isSaving ?? this.isSaving,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

class OnboardingNotifier extends StateNotifier<OnboardingState> {
  final ProfileRepository _repo;

  OnboardingNotifier(this._repo) : super(const OnboardingState());

  // --- Navigation ---

  void goToStep(int step) {
    if (step < 0 || step > 3) return;
    state = state.copyWith(currentStep: step);
  }

  void nextStep() {
    if (state.currentStep < 3) {
      state = state.copyWith(currentStep: state.currentStep + 1);
    }
  }

  void prevStep() {
    if (state.currentStep > 0) {
      state = state.copyWith(currentStep: state.currentStep - 1);
    }
  }

  // --- Step 1: photos ---

  void setPhotoCount(int count) {
    state = state.copyWith(photoCount: count);
  }

  // --- Step 2: basics ---

  void setName(String name) {
    state = state.copyWith(name: name);
  }

  void setBirthday(DateTime? birthday) {
    if (birthday == null) {
      state = state.copyWith(clearBirthday: true);
    } else {
      state = state.copyWith(birthday: birthday);
    }
  }

  void setGender(String? gender) {
    if (gender == null) {
      state = state.copyWith(clearGender: true);
    } else {
      state = state.copyWith(gender: gender);
    }
  }

  // --- Step 3: personality ---

  void setBio(String bio) {
    state = state.copyWith(bio: bio);
  }

  void setPromptQuestion(String? question) {
    if (question == null) {
      state = state.copyWith(clearPromptQuestion: true);
    } else {
      state = state.copyWith(promptQuestion: question);
    }
  }

  void setPromptAnswer(String answer) {
    state = state.copyWith(promptAnswer: answer);
  }

  // --- Step 4: preferences ---

  void toggleGenderSeeking(String gender) {
    final list = List<String>.from(state.gendersSeeking);
    if (list.contains(gender)) {
      list.remove(gender);
    } else {
      list.add(gender);
    }
    state = state.copyWith(gendersSeeking: list);
  }

  void setAgeRange(double min, double max) {
    state = state.copyWith(ageMin: min, ageMax: max);
  }

  void setDistance(double miles) {
    state = state.copyWith(distanceMiles: miles);
  }

  // --- Save ---

  /// Create profile + update preferences. Returns true on success.
  Future<bool> saveProfile() async {
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      // 1. Create profile
      final prompts = <Map<String, String>>[];
      if (state.promptQuestion != null &&
          state.promptAnswer.trim().isNotEmpty) {
        prompts.add({
          'question': state.promptQuestion!,
          'answer': state.promptAnswer.trim(),
        });
      }

      await _repo.createProfile({
        'name': state.name.trim(),
        'dob': state.dobString,
        'gender': state.gender,
        'bio': state.bio.trim(),
        'prompts': prompts,
      });

      // 2. Update preferences
      await _repo.updatePreferences({
        'genders_seeking': state.gendersSeeking,
        'age_min': state.ageMin.round(),
        'age_max': state.ageMax.round(),
        'distance_miles': state.distanceMiles.round(),
      });

      state = state.copyWith(isSaving: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isSaving: false,
        error: ProfileRepository.extractError(e),
      );
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final onboardingProvider =
    StateNotifierProvider<OnboardingNotifier, OnboardingState>((ref) {
  final repo = ref.watch(profileRepositoryProvider);
  return OnboardingNotifier(repo);
});
