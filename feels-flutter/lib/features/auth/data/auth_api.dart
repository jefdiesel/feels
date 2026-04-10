import 'package:dio/dio.dart';

class AuthTokens {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;
  final bool? isNewUser;

  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    this.isNewUser,
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) {
    return AuthTokens(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      expiresIn: json['expires_in'] as int,
      isNewUser: json['is_new_user'] as bool?,
    );
  }
}

class AuthApi {
  final Dio _dio;

  AuthApi({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: const String.fromEnvironment(
                'API_BASE_URL',
                defaultValue: 'https://api.feelsfun.app/api/v1',
              ),
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 10),
              headers: {'Content-Type': 'application/json'},
            ));

  Dio get dio => _dio;

  /// Send a magic link to the given email address.
  Future<Map<String, dynamic>> sendMagicLink(String email) async {
    final response = await _dio.post('/auth/magic/send', data: {
      'email': email,
    });
    return response.data as Map<String, dynamic>;
  }

  /// Verify a magic link token and return auth tokens.
  Future<AuthTokens> verifyMagicLink({
    required String token,
    required String deviceId,
    String? platform,
  }) async {
    final response = await _dio.post('/auth/magic/verify', data: {
      'token': token,
      'device_id': deviceId,
      if (platform != null) 'platform': platform,
    });
    return AuthTokens.fromJson(response.data as Map<String, dynamic>);
  }

  /// Authenticate via Apple Sign In.
  Future<AuthTokens> appleAuth({
    required String identityToken,
    required String userId,
    String? email,
    String? fullName,
    required String deviceId,
    String? platform,
  }) async {
    final response = await _dio.post('/auth/apple', data: {
      'identity_token': identityToken,
      'user_id': userId,
      if (email != null) 'email': email,
      if (fullName != null) 'full_name': fullName,
      'device_id': deviceId,
      if (platform != null) 'platform': platform,
    });
    return AuthTokens.fromJson(response.data as Map<String, dynamic>);
  }

  /// Email + password login (legacy / reviewer access only).
  Future<AuthTokens> passwordLogin({
    required String email,
    required String password,
    required String deviceId,
    String? platform,
  }) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
      'device_id': deviceId,
      if (platform != null) 'platform': platform,
    });
    return AuthTokens.fromJson(response.data as Map<String, dynamic>);
  }

  /// Refresh an expired access token.
  Future<AuthTokens> refresh(String refreshToken) async {
    final response = await _dio.post('/auth/refresh', data: {
      'refresh_token': refreshToken,
    });
    return AuthTokens.fromJson(response.data as Map<String, dynamic>);
  }

  /// Permanently delete the authenticated user's account.
  Future<void> deleteAccount(String accessToken) async {
    await _dio.delete(
      '/auth/account',
      options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
    );
  }
}
