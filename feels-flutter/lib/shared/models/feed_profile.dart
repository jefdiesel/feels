import 'photo.dart';
import 'profile.dart';
import 'prompt.dart';

enum FeedPriority {
  qualifiedSuperlike,
  qualifiedLike,
  gapSuperlike,
  browse;

  static FeedPriority fromString(String value) {
    switch (value) {
      case 'qualified_superlike':
        return FeedPriority.qualifiedSuperlike;
      case 'qualified_like':
        return FeedPriority.qualifiedLike;
      case 'gap_superlike':
        return FeedPriority.gapSuperlike;
      case 'browse':
        return FeedPriority.browse;
      default:
        return FeedPriority.browse;
    }
  }

  String toJson() {
    switch (this) {
      case FeedPriority.qualifiedSuperlike:
        return 'qualified_superlike';
      case FeedPriority.qualifiedLike:
        return 'qualified_like';
      case FeedPriority.gapSuperlike:
        return 'gap_superlike';
      case FeedPriority.browse:
        return 'browse';
    }
  }
}

class FeedProfile extends Profile {
  final int age;
  final int? distance;
  final FeedPriority priority;
  final List<String> genderTags;

  const FeedProfile({
    required super.userId,
    required super.name,
    required super.dob,
    required super.gender,
    super.genderIdentity,
    required super.zipCode,
    super.neighborhood,
    required super.bio,
    required super.prompts,
    super.kinkLevel,
    required super.lookingFor,
    super.zodiac,
    super.religion,
    super.hasKids,
    super.wantsKids,
    super.alcohol,
    super.weed,
    super.workForMoney,
    super.workForPassion,
    super.lat,
    super.lng,
    required super.isVerified,
    required super.lastActive,
    required super.createdAt,
    required super.photos,
    super.shareCode,
    required this.age,
    this.distance,
    required this.priority,
    required this.genderTags,
  });

  factory FeedProfile.fromJson(Map<String, dynamic> json) {
    return FeedProfile(
      userId: json['user_id'] as String,
      name: json['name'] as String,
      dob: json['dob'] as String,
      gender: json['gender'] as String,
      genderIdentity: json['gender_identity'] as String?,
      zipCode: json['zip_code'] as String,
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
      lastActive: DateTime.parse(json['last_active'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => Photo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      shareCode: json['share_code'] as String?,
      age: json['age'] as int,
      distance: json['distance'] as int?,
      priority: FeedPriority.fromString(json['priority'] as String),
      genderTags: (json['gender_tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  @override
  Map<String, dynamic> toJson() {
    final map = super.toJson();
    map['age'] = age;
    if (distance != null) map['distance'] = distance;
    map['priority'] = priority.toJson();
    map['gender_tags'] = genderTags;
    return map;
  }

  @override
  String toString() =>
      'FeedProfile(userId: $userId, name: $name, age: $age, priority: $priority)';
}
