import '../../../../shared/models/photo.dart';
import '../../../../shared/models/prompt.dart';

class FeedProfile {
  final String userId;
  final String name;
  final DateTime dob;
  final String gender;
  final String? genderIdentity;
  final String zipCode;
  final String? neighborhood;
  final String bio;
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
  final DateTime lastActive;
  final DateTime createdAt;
  final int age;
  final int? distance;
  final String priority;
  final List<Photo> photos;
  final List<String> genderTags;
  final List<Prompt> prompts;

  const FeedProfile({
    required this.userId,
    required this.name,
    required this.dob,
    required this.gender,
    this.genderIdentity,
    required this.zipCode,
    this.neighborhood,
    required this.bio,
    this.kinkLevel,
    required this.lookingFor,
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
    required this.isVerified,
    required this.lastActive,
    required this.createdAt,
    required this.age,
    this.distance,
    required this.priority,
    required this.photos,
    required this.genderTags,
    this.prompts = const [],
  });

  factory FeedProfile.fromJson(Map<String, dynamic> json) {
    return FeedProfile(
      userId: json['user_id'] as String,
      name: json['name'] as String,
      dob: DateTime.parse(json['dob'] as String),
      gender: json['gender'] as String,
      genderIdentity: json['gender_identity'] as String?,
      zipCode: json['zip_code'] as String? ?? '',
      neighborhood: json['neighborhood'] as String?,
      bio: json['bio'] as String? ?? '',
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
      age: json['age'] as int,
      distance: json['distance'] as int?,
      priority: json['priority'] as String? ?? 'browse',
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => Photo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      genderTags: (json['gender_tags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      prompts: (json['prompts'] as List<dynamic>?)
              ?.map((e) => Prompt.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'name': name,
      'dob': dob.toIso8601String(),
      'gender': gender,
      if (genderIdentity != null) 'gender_identity': genderIdentity,
      'zip_code': zipCode,
      if (neighborhood != null) 'neighborhood': neighborhood,
      'bio': bio,
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
      'is_verified': isVerified,
      'last_active': lastActive.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'age': age,
      if (distance != null) 'distance': distance,
      'priority': priority,
      'photos': photos.map((e) => e.toJson()).toList(),
      'gender_tags': genderTags,
      'prompts': prompts.map((e) => e.toJson()).toList(),
    };
  }

  /// Primary photo URL (first by position).
  String? get primaryPhotoUrl {
    if (photos.isEmpty) return null;
    final sorted = List<Photo>.from(photos)
      ..sort((a, b) => a.position.compareTo(b.position));
    return sorted.first.url;
  }

  /// All photo URLs sorted by position.
  List<String> get sortedPhotoUrls {
    final sorted = List<Photo>.from(photos)
      ..sort((a, b) => a.position.compareTo(b.position));
    return sorted.map((p) => p.url).toList();
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is FeedProfile &&
          runtimeType == other.runtimeType &&
          userId == other.userId;

  @override
  int get hashCode => userId.hashCode;

  @override
  String toString() => 'FeedProfile(userId: $userId, name: $name, age: $age)';
}
