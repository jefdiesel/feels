class GenderPresentation {
  final bool enabled;
  final String? bio;
  final List<String> tags;
  final int? ageMin;
  final int? ageMax;

  const GenderPresentation({
    required this.enabled,
    this.bio,
    required this.tags,
    this.ageMin,
    this.ageMax,
  });

  factory GenderPresentation.fromJson(Map<String, dynamic> json) {
    return GenderPresentation(
      enabled: json['enabled'] as bool? ?? false,
      bio: json['bio'] as String?,
      tags: (json['tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      ageMin: json['age_min'] as int?,
      ageMax: json['age_max'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'enabled': enabled,
      if (bio != null) 'bio': bio,
      'tags': tags,
      if (ageMin != null) 'age_min': ageMin,
      if (ageMax != null) 'age_max': ageMax,
    };
  }
}

class Preferences {
  final List<String> gendersSeeking;
  final int ageMin;
  final int ageMax;
  final int distanceMiles;
  final List<String> visibleToGenders;
  final List<String>? hardBlockGenders;
  final Map<String, GenderPresentation>? genderPresentations;
  final bool isPrivate;

  const Preferences({
    required this.gendersSeeking,
    required this.ageMin,
    required this.ageMax,
    required this.distanceMiles,
    required this.visibleToGenders,
    this.hardBlockGenders,
    this.genderPresentations,
    required this.isPrivate,
  });

  factory Preferences.fromJson(Map<String, dynamic> json) {
    Map<String, GenderPresentation>? presentations;
    if (json['gender_presentations'] != null) {
      final raw = json['gender_presentations'] as Map<String, dynamic>;
      presentations = raw.map(
        (key, value) => MapEntry(
          key,
          GenderPresentation.fromJson(value as Map<String, dynamic>),
        ),
      );
    }

    return Preferences(
      gendersSeeking: (json['genders_seeking'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      ageMin: json['age_min'] as int? ?? 18,
      ageMax: json['age_max'] as int? ?? 99,
      distanceMiles: json['distance_miles'] as int? ?? 25,
      visibleToGenders: (json['visible_to_genders'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      hardBlockGenders: (json['hard_block_genders'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      genderPresentations: presentations,
      isPrivate: json['is_private'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'genders_seeking': gendersSeeking,
      'age_min': ageMin,
      'age_max': ageMax,
      'distance_miles': distanceMiles,
      'visible_to_genders': visibleToGenders,
      if (hardBlockGenders != null) 'hard_block_genders': hardBlockGenders,
      if (genderPresentations != null)
        'gender_presentations': genderPresentations!
            .map((key, value) => MapEntry(key, value.toJson())),
      'is_private': isPrivate,
    };
  }

  Preferences copyWith({
    List<String>? gendersSeeking,
    int? ageMin,
    int? ageMax,
    int? distanceMiles,
    List<String>? visibleToGenders,
    List<String>? hardBlockGenders,
    Map<String, GenderPresentation>? genderPresentations,
    bool? isPrivate,
  }) {
    return Preferences(
      gendersSeeking: gendersSeeking ?? this.gendersSeeking,
      ageMin: ageMin ?? this.ageMin,
      ageMax: ageMax ?? this.ageMax,
      distanceMiles: distanceMiles ?? this.distanceMiles,
      visibleToGenders: visibleToGenders ?? this.visibleToGenders,
      hardBlockGenders: hardBlockGenders ?? this.hardBlockGenders,
      genderPresentations: genderPresentations ?? this.genderPresentations,
      isPrivate: isPrivate ?? this.isPrivate,
    );
  }

  @override
  String toString() =>
      'Preferences(gendersSeeking: $gendersSeeking, ageRange: $ageMin-$ageMax, distance: $distanceMiles mi)';
}
