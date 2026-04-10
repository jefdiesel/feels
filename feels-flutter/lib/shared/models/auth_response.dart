class AuthResponse {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final bool? isNewUser;

  const AuthResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    this.isNewUser,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      expiresIn: json['expires_in'] as int,
      isNewUser: json['is_new_user'] as bool?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'access_token': accessToken,
      'refresh_token': refreshToken,
      'expires_in': expiresIn,
      if (isNewUser != null) 'is_new_user': isNewUser,
    };
  }

  @override
  String toString() =>
      'AuthResponse(expiresIn: $expiresIn, isNewUser: $isNewUser)';
}
