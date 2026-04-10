/// Domain models for the profile feature.

class Photo {
  final String id;
  final String userId;
  final String url;
  final int position;
  final DateTime createdAt;

  const Photo({
    required this.id,
    required this.userId,
    required this.url,
    required this.position,
    required this.createdAt,
  });

  factory Photo.fromJson(Map<String, dynamic> json) {
    return Photo(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      url: json['url'] as String,
      position: json['position'] as int,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'url': url,
        'position': position,
        'created_at': createdAt.toIso8601String(),
      };
}

class Prompt {
  final String question;
  final String answer;

  const Prompt({required this.question, required this.answer});

  factory Prompt.fromJson(Map<String, dynamic> json) {
    return Prompt(
      question: json['question'] as String,
      answer: json['answer'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'question': question,
        'answer': answer,
      };
}

class Profile {
  final String? userId;
  final String name;
  final String? dob;
  final String? gender;
  final String? genderIdentity;
  final String? zipCode;
  final String? neighborhood;
  final String bio;
  final List<Prompt> prompts;
  final String? kinkLevel;
  final List<String> lookingFor;
  final String? zodiac;
  final String? religion;
  final bool? hasKids;
  final String? wantsKids;
  final String? alcohol;
  final String? weed;
  final String? workForMoney;
  final String? workForPassion;
  final double? lat;
  final double? lng;
  final bool isVerified;
  final DateTime? lastActive;
  final DateTime? createdAt;
  final int? age;
  final List<Photo> photos;
  final List<String> genderTags;

  const Profile({
    this.userId,
    required this.name,
    this.dob,
    this.gender,
    this.genderIdentity,
    this.zipCode,
    this.neighborhood,
    this.bio = '',
    this.prompts = const [],
    this.kinkLevel,
    this.lookingFor = const [],
    this.zodiac,
    this.religion,
    this.hasKids,
    this.wantsKids,
    this.alcohol,
    this.weed,
    this.workForMoney,
    this.workForPassion,
    this.lat,
    this.lng,
    this.isVerified = false,
    this.lastActive,
    this.createdAt,
    this.age,
    this.photos = const [],
    this.genderTags = const [],
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
      userId: json['user_id'] as String?,
      name: json['name'] as String? ?? '',
      dob: json['dob'] as String?,
      gender: json['gender'] as String?,
      genderIdentity: json['gender_identity'] as String?,
      zipCode: json['zip_code'] as String?,
      neighborhood: json['neighborhood'] as String?,
      bio: json['bio'] as String? ?? '',
      prompts: (json['prompts'] as List<dynamic>?)
              ?.map((e) => Prompt.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      kinkLevel: json['kink_level'] as String?,
      lookingFor: (json['looking_for'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      zodiac: json['zodiac'] as String?,
      religion: json['religion'] as String?,
      hasKids: json['has_kids'] as bool?,
      wantsKids: json['wants_kids'] as String?,
      alcohol: json['alcohol'] as String?,
      weed: json['weed'] as String?,
      workForMoney: json['work_for_money'] as String?,
      workForPassion: json['work_for_passion'] as String?,
      lat: (json['lat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble(),
      isVerified: json['is_verified'] as bool? ?? false,
      lastActive: json['last_active'] != null
          ? DateTime.parse(json['last_active'] as String)
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      age: json['age'] as int?,
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => Photo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      genderTags: (json['gender_tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        if (userId != null) 'user_id': userId,
        'name': name,
        if (dob != null) 'dob': dob,
        if (gender != null) 'gender': gender,
        if (genderIdentity != null) 'gender_identity': genderIdentity,
        if (zipCode != null) 'zip_code': zipCode,
        if (neighborhood != null) 'neighborhood': neighborhood,
        'bio': bio,
        'prompts': prompts.map((p) => p.toJson()).toList(),
        if (kinkLevel != null) 'kink_level': kinkLevel,
        'looking_for': lookingFor,
        if (zodiac != null) 'zodiac': zodiac,
        if (religion != null) 'religion': religion,
        if (hasKids != null) 'has_kids': hasKids,
        if (wantsKids != null) 'wants_kids': wantsKids,
        if (alcohol != null) 'alcohol': alcohol,
        if (weed != null) 'weed': weed,
        if (workForMoney != null) 'work_for_money': workForMoney,
        if (workForPassion != null) 'work_for_passion': workForPassion,
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      };

  Profile copyWith({
    String? userId,
    String? name,
    String? dob,
    String? gender,
    String? genderIdentity,
    String? zipCode,
    String? neighborhood,
    String? bio,
    List<Prompt>? prompts,
    String? kinkLevel,
    List<String>? lookingFor,
    String? zodiac,
    String? religion,
    bool? hasKids,
    String? wantsKids,
    String? alcohol,
    String? weed,
    String? workForMoney,
    String? workForPassion,
    double? lat,
    double? lng,
    bool? isVerified,
    DateTime? lastActive,
    DateTime? createdAt,
    int? age,
    List<Photo>? photos,
    List<String>? genderTags,
  }) {
    return Profile(
      userId: userId ?? this.userId,
      name: name ?? this.name,
      dob: dob ?? this.dob,
      gender: gender ?? this.gender,
      genderIdentity: genderIdentity ?? this.genderIdentity,
      zipCode: zipCode ?? this.zipCode,
      neighborhood: neighborhood ?? this.neighborhood,
      bio: bio ?? this.bio,
      prompts: prompts ?? this.prompts,
      kinkLevel: kinkLevel ?? this.kinkLevel,
      lookingFor: lookingFor ?? this.lookingFor,
      zodiac: zodiac ?? this.zodiac,
      religion: religion ?? this.religion,
      hasKids: hasKids ?? this.hasKids,
      wantsKids: wantsKids ?? this.wantsKids,
      alcohol: alcohol ?? this.alcohol,
      weed: weed ?? this.weed,
      workForMoney: workForMoney ?? this.workForMoney,
      workForPassion: workForPassion ?? this.workForPassion,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      isVerified: isVerified ?? this.isVerified,
      lastActive: lastActive ?? this.lastActive,
      createdAt: createdAt ?? this.createdAt,
      age: age ?? this.age,
      photos: photos ?? this.photos,
      genderTags: genderTags ?? this.genderTags,
    );
  }
}

class Preferences {
  final List<String> gendersSeeking;
  final int ageMin;
  final int ageMax;
  final int distanceMiles;
  final List<String> visibleToGenders;
  final List<String> hardBlockGenders;
  final Map<String, GenderPresentation> genderPresentations;
  final bool isPrivate;

  const Preferences({
    this.gendersSeeking = const [],
    this.ageMin = 18,
    this.ageMax = 99,
    this.distanceMiles = 50,
    this.visibleToGenders = const [],
    this.hardBlockGenders = const [],
    this.genderPresentations = const {},
    this.isPrivate = false,
  });

  factory Preferences.fromJson(Map<String, dynamic> json) {
    final gpJson =
        json['gender_presentations'] as Map<String, dynamic>? ?? {};
    final gp = gpJson.map((k, v) =>
        MapEntry(k, GenderPresentation.fromJson(v as Map<String, dynamic>)));

    return Preferences(
      gendersSeeking: (json['genders_seeking'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      ageMin: json['age_min'] as int? ?? 18,
      ageMax: json['age_max'] as int? ?? 99,
      distanceMiles: json['distance_miles'] as int? ?? 50,
      visibleToGenders: (json['visible_to_genders'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      hardBlockGenders: (json['hard_block_genders'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      genderPresentations: gp,
      isPrivate: json['is_private'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'genders_seeking': gendersSeeking,
        'age_min': ageMin,
        'age_max': ageMax,
        'distance_miles': distanceMiles,
        'visible_to_genders': visibleToGenders,
        'hard_block_genders': hardBlockGenders,
        'gender_presentations':
            genderPresentations.map((k, v) => MapEntry(k, v.toJson())),
        'is_private': isPrivate,
      };

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
}

class GenderPresentation {
  final bool enabled;
  final String? bio;
  final List<String> tags;
  final int? ageMin;
  final int? ageMax;

  const GenderPresentation({
    this.enabled = false,
    this.bio,
    this.tags = const [],
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

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        if (bio != null) 'bio': bio,
        'tags': tags,
        if (ageMin != null) 'age_min': ageMin,
        if (ageMax != null) 'age_max': ageMax,
      };
}

class ProfileAnalytics {
  final int viewCount;
  final int viewCount7d;
  final int viewCount30d;

  const ProfileAnalytics({
    this.viewCount = 0,
    this.viewCount7d = 0,
    this.viewCount30d = 0,
  });

  factory ProfileAnalytics.fromJson(Map<String, dynamic> json) {
    return ProfileAnalytics(
      viewCount: json['view_count'] as int? ?? 0,
      viewCount7d: json['view_count_7d'] as int? ?? 0,
      viewCount30d: json['view_count_30d'] as int? ?? 0,
    );
  }
}

class ShareLink {
  final String url;
  final String title;
  final String text;

  const ShareLink({
    required this.url,
    required this.title,
    required this.text,
  });

  factory ShareLink.fromJson(Map<String, dynamic> json) {
    return ShareLink(
      url: json['url'] as String,
      title: json['title'] as String,
      text: json['text'] as String,
    );
  }
}

/// Wrapper returned by GET /profile which bundles profile + preferences + age.
class ProfileResponse {
  final Profile profile;
  final Preferences preferences;
  final int age;

  const ProfileResponse({
    required this.profile,
    required this.preferences,
    required this.age,
  });

  factory ProfileResponse.fromJson(Map<String, dynamic> json) {
    return ProfileResponse(
      profile: Profile.fromJson(json['profile'] as Map<String, dynamic>),
      preferences:
          Preferences.fromJson(json['preferences'] as Map<String, dynamic>),
      age: json['age'] as int? ?? 0,
    );
  }
}
