import 'dart:io' show Platform;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'auth_api.dart';

const _keyAccessToken = 'access_token';
const _keyRefreshToken = 'refresh_token';
const _keyExpiresAt = 'expires_at';

class AuthSession {
  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;
  final bool isNewUser;

  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresAt,
    this.isNewUser = false,
  });
}

class AuthRepository {
  final AuthApi _api;
  final FlutterSecureStorage _storage;
  final DeviceInfoPlugin _deviceInfo;

  AuthSession? _session;

  AuthRepository({
    AuthApi? api,
    FlutterSecureStorage? storage,
    DeviceInfoPlugin? deviceInfo,
  })  : _api = api ?? AuthApi(),
        _storage = storage ?? const FlutterSecureStorage(),
        _deviceInfo = deviceInfo ?? DeviceInfoPlugin();

  bool get isAuthenticated => _session != null;
  String? get accessToken => _session?.accessToken;

  /// Debug: save tokens directly (skips normal auth flow).
  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
    _session = AuthSession(accessToken: accessToken, refreshToken: refreshToken, expiresAt: DateTime.now().add(const Duration(minutes: 15)));
  }

  // ---------------------------------------------------------------------------
  // Device ID
  // ---------------------------------------------------------------------------

  Future<String> getDeviceId() async {
    if (Platform.isIOS) {
      final info = await _deviceInfo.iosInfo;
      return info.identifierForVendor ?? 'unknown-ios';
    } else if (Platform.isAndroid) {
      final info = await _deviceInfo.androidInfo;
      return info.id;
    }
    return 'unknown-device';
  }

  String get _platform {
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'unknown';
  }

  // ---------------------------------------------------------------------------
  // Token persistence
  // ---------------------------------------------------------------------------

  Future<void> _persistTokens(AuthTokens tokens) async {
    final expiresAt =
        DateTime.now().add(Duration(seconds: tokens.expiresIn));

    await Future.wait([
      _storage.write(key: _keyAccessToken, value: tokens.accessToken),
      _storage.write(key: _keyRefreshToken, value: tokens.refreshToken),
      _storage.write(key: _keyExpiresAt, value: expiresAt.toIso8601String()),
    ]);

    _session = AuthSession(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: expiresAt,
      isNewUser: tokens.isNewUser ?? false,
    );
  }

  Future<void> _clearTokens() async {
    await Future.wait([
      _storage.delete(key: _keyAccessToken),
      _storage.delete(key: _keyRefreshToken),
      _storage.delete(key: _keyExpiresAt),
    ]);
    _session = null;
  }

  // ---------------------------------------------------------------------------
  // Auth flows
  // ---------------------------------------------------------------------------

  /// Send a magic link email. Returns the API response (contains `message`).
  Future<Map<String, dynamic>> sendMagicLink(String email) {
    return _api.sendMagicLink(email);
  }

  /// Verify a magic link token, persist tokens, return session.
  Future<AuthSession> verifyMagicLink(String token) async {
    final deviceId = await getDeviceId();
    final tokens = await _api.verifyMagicLink(
      token: token,
      deviceId: deviceId,
      platform: _platform,
    );
    await _persistTokens(tokens);
    return _session!;
  }

  /// Authenticate via Apple Sign In, persist tokens, return session.
  Future<AuthSession> appleAuth({
    required String identityToken,
    required String userId,
    String? email,
    String? fullName,
  }) async {
    final deviceId = await getDeviceId();
    final tokens = await _api.appleAuth(
      identityToken: identityToken,
      userId: userId,
      email: email,
      fullName: fullName,
      deviceId: deviceId,
      platform: _platform,
    );
    await _persistTokens(tokens);
    return _session!;
  }

  /// Email + password login (legacy / reviewer access only).
  Future<AuthSession> passwordLogin({
    required String email,
    required String password,
  }) async {
    final deviceId = await getDeviceId();
    final tokens = await _api.passwordLogin(
      email: email,
      password: password,
      deviceId: deviceId,
      platform: _platform,
    );
    await _persistTokens(tokens);
    return _session!;
  }

  /// Try to refresh the access token using the stored refresh token.
  Future<bool> refreshSession() async {
    final refreshToken = await _storage.read(key: _keyRefreshToken);
    if (refreshToken == null) return false;

    try {
      final tokens = await _api.refresh(refreshToken);
      await _persistTokens(tokens);
      return true;
    } catch (_) {
      await _clearTokens();
      return false;
    }
  }

  /// Load a previously persisted session. Refreshes if the access token is
  /// expired. Returns true if the user is authenticated afterward.
  Future<bool> loadSession() async {
    final accessToken = await _storage.read(key: _keyAccessToken);
    final refreshToken = await _storage.read(key: _keyRefreshToken);
    final expiresAtStr = await _storage.read(key: _keyExpiresAt);

    if (accessToken == null || refreshToken == null || expiresAtStr == null) {
      return false;
    }

    final expiresAt = DateTime.tryParse(expiresAtStr);
    if (expiresAt == null) {
      await _clearTokens();
      return false;
    }

    // If token is still valid (with 60s buffer), use it directly.
    if (expiresAt.isAfter(DateTime.now().add(const Duration(seconds: 60)))) {
      _session = AuthSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt,
      );
      return true;
    }

    // Token expired or about to expire — try refresh.
    return refreshSession();
  }

  /// Log the user out: clear stored tokens and in-memory session.
  Future<void> logout() async {
    await _clearTokens();
  }

  /// Delete the user's account then clear local session.
  Future<void> deleteAccount() async {
    final token = _session?.accessToken;
    if (token != null) {
      await _api.deleteAccount(token);
    }
    await _clearTokens();
  }
}
