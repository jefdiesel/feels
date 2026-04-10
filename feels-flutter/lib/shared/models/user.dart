import 'prompt.dart';

class User {
  final String id;
  final String email;
  final String? phone;
  final bool phoneVerified;
  final bool totpEnabled;
  final String name;
  final String bio;
  final int age;
  final String neighborhood;
  final List<String> photos;
  final List<Prompt> prompts;
  final bool isVerified;
  final List<String> lookingFor;

  const User({
    required this.id,
    required this.email,
    this.phone,
    required this.phoneVerified,
    required this.totpEnabled,
    required this.name,
    required this.bio,
    required this.age,
    required this.neighborhood,
    required this.photos,
    required this.prompts,
    required this.isVerified,
    required this.lookingFor,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      phoneVerified: json['phone_verified'] as bool? ?? false,
      totpEnabled: json['totp_enabled'] as bool? ?? false,
      name: json['name'] as String,
      bio: json['bio'] as String? ?? '',
      age: json['age'] as int,
      neighborhood: json['neighborhood'] as String? ?? '',
      photos: (json['photos'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      prompts: (json['prompts'] as List<dynamic>?)
              ?.map((e) => Prompt.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      isVerified: json['is_verified'] as bool? ?? false,
      lookingFor: (json['looking_for'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      if (phone != null) 'phone': phone,
      'phone_verified': phoneVerified,
      'totp_enabled': totpEnabled,
      'name': name,
      'bio': bio,
      'age': age,
      'neighborhood': neighborhood,
      'photos': photos,
      'prompts': prompts.map((e) => e.toJson()).toList(),
      'is_verified': isVerified,
      'looking_for': lookingFor,
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? phone,
    bool? phoneVerified,
    bool? totpEnabled,
    String? name,
    String? bio,
    int? age,
    String? neighborhood,
    List<String>? photos,
    List<Prompt>? prompts,
    bool? isVerified,
    List<String>? lookingFor,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      totpEnabled: totpEnabled ?? this.totpEnabled,
      name: name ?? this.name,
      bio: bio ?? this.bio,
      age: age ?? this.age,
      neighborhood: neighborhood ?? this.neighborhood,
      photos: photos ?? this.photos,
      prompts: prompts ?? this.prompts,
      isVerified: isVerified ?? this.isVerified,
      lookingFor: lookingFor ?? this.lookingFor,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is User && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'User(id: $id, name: $name, email: $email)';
}
