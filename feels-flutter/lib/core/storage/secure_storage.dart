import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _keyAccessToken = 'feels_access_token';
const _keyRefreshToken = 'feels_refresh_token';
const _keyDeviceId = 'feels_device_id';

/// Provides a singleton [SecureStorageService] via Riverpod.
final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// Manages JWT tokens and device identity in flutter_secure_storage.
class SecureStorageService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // ---------------------------------------------------------------------------
  // Access token
  // ---------------------------------------------------------------------------

  Future<String?> getAccessToken() => _storage.read(key: _keyAccessToken);

  Future<void> setAccessToken(String token) =>
      _storage.write(key: _keyAccessToken, value: token);

  Future<void> deleteAccessToken() => _storage.delete(key: _keyAccessToken);

  // ---------------------------------------------------------------------------
  // Refresh token
  // ---------------------------------------------------------------------------

  Future<String?> getRefreshToken() => _storage.read(key: _keyRefreshToken);

  Future<void> setRefreshToken(String token) =>
      _storage.write(key: _keyRefreshToken, value: token);

  Future<void> deleteRefreshToken() => _storage.delete(key: _keyRefreshToken);

  // ---------------------------------------------------------------------------
  // Convenience: store both tokens at once
  // ---------------------------------------------------------------------------

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      setAccessToken(accessToken),
      setRefreshToken(refreshToken),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Device ID (persistent across sessions)
  // ---------------------------------------------------------------------------

  Future<String?> getDeviceId() => _storage.read(key: _keyDeviceId);

  Future<void> setDeviceId(String id) =>
      _storage.write(key: _keyDeviceId, value: id);

  // ---------------------------------------------------------------------------
  // Clear all auth data (logout)
  // ---------------------------------------------------------------------------

  Future<void> clearAuth() async {
    await Future.wait([
      deleteAccessToken(),
      deleteRefreshToken(),
    ]);
  }

  /// Check whether we have stored tokens.
  Future<bool> hasTokens() async {
    final access = await getAccessToken();
    return access != null && access.isNotEmpty;
  }
}
