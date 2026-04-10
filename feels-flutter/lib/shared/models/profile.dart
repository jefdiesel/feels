import 'photo.dart';
import 'prompt.dart';

class Profile {
  final String userId;
  final String name;
  final String dob;
  final String gender;
  final String? genderIdentity;
  final String zipCode;
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
  final DateTime lastActive;
  final DateTime createdAt;
  final List<Photo> photos;
  final String? shareCode;

  const Profile({
    required this.userId,
    required this.name,
    required this.dob,
    required this.gender,
    this.genderIdentity,
    required this.zipCode,
    this.neighborhood,
    required this.bio,
    required this.prompts,
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
    required this.photos,
    this.shareCode,
  });

  factory Profile.fromJson(Map<String, dynamic> json) {
    return Profile(
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
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'name': name,
      'dob': dob,
      'gender': gender,
      if (genderIdentity != null) 'gender_identity': genderIdentity,
      'zip_code': zipCode,
      if (neighborhood != null) 'neighborhood': neighborhood,
      'bio': bio,
      'prompts': prompts.map((e) => e.toJson()).toList(),
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
      'photos': photos.map((e) => e.toJson()).toList(),
      if (shareCode != null) 'share_code': shareCode,
    };
  }

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
    List<Photo>? photos,
    String? shareCode,
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
      photos: photos ?? this.photos,
      shareCode: shareCode ?? this.shareCode,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Profile &&
          runtimeType == other.runtimeType &&
          userId == other.userId;

  @override
  int get hashCode => userId.hashCode;

  @override
  String toString() => 'Profile(userId: $userId, name: $name)';
}
