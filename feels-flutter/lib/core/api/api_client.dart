import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/secure_storage.dart';
import 'endpoints.dart';

/// Build-time environment config loaded from --dart-define.
class Env {
  Env._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.feelsfun.app',
  );

  static const String wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'wss://api.feelsfun.app',
  );

  static const String sentryDsn = String.fromEnvironment('SENTRY_DSN');

  static const String revenueCatKeyIos =
      String.fromEnvironment('REVENUECAT_KEY_IOS');

  static const String revenueCatKeyAndroid =
      String.fromEnvironment('REVENUECAT_KEY_ANDROID');
}

/// Provides the configured [Dio] HTTP client via Riverpod.
final apiClientProvider = Provider<Dio>((ref) {
  final storage = ref.read(secureStorageProvider);
  return createDio(storage);
});

/// Creates a [Dio] instance with JWT auth and auto-refresh interceptors.
Dio createDio(SecureStorageService storage) {
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  dio.interceptors.add(_AuthInterceptor(dio, storage));

  return dio;
}

/// Intercepts requests to add JWT and handles 401 by refreshing the token.
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._dio, this._storage);

  final Dio _dio;
  final SecureStorageService _storage;

  /// Prevents concurrent refresh requests.
  Completer<bool>? _refreshCompleter;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth header for auth endpoints that don't need it.
    final noAuthPaths = [
      Endpoints.authMagicSend,
      Endpoints.authMagicVerify,
      Endpoints.authApple,
      Endpoints.authRefresh,
      Endpoints.authPhoneSend,
      Endpoints.authPhoneLogin,
    ];
    if (!noAuthPaths.contains(options.path)) {
      final token = await _storage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // Don't try to refresh if the refresh endpoint itself failed.
    if (err.requestOptions.path == Endpoints.authRefresh) {
      await _storage.clearAuth();
      return handler.next(err);
    }

    // If a refresh is already in progress, wait for it.
    if (_refreshCompleter != null) {
      final success = await _refreshCompleter!.future;
      if (success) {
        return handler.resolve(await _retry(err.requestOptions));
      }
      return handler.next(err);
    }

    _refreshCompleter = Completer<bool>();

    try {
      final refreshToken = await _storage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        _refreshCompleter!.complete(false);
        _refreshCompleter = null;
        await _storage.clearAuth();
        return handler.next(err);
      }

      // Use a separate Dio instance for refresh to avoid interceptor loop.
      final refreshDio = Dio(BaseOptions(baseUrl: Env.apiBaseUrl));
      final response = await refreshDio.post(
        Endpoints.authRefresh,
        data: {'refresh_token': refreshToken},
      );

      final newAccess = response.data['access_token'] as String;
      final newRefresh = response.data['refresh_token'] as String;

      await _storage.saveTokens(
        accessToken: newAccess,
        refreshToken: newRefresh,
      );

      _refreshCompleter!.complete(true);
      _refreshCompleter = null;

      return handler.resolve(await _retry(err.requestOptions));
    } catch (_) {
      _refreshCompleter!.complete(false);
      _refreshCompleter = null;
      await _storage.clearAuth();
      return handler.next(err);
    }
  }

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) async {
    final token = await _storage.getAccessToken();
    final options = Options(
      method: requestOptions.method,
      headers: {
        ...requestOptions.headers,
        'Authorization': 'Bearer $token',
      },
    );
    return _dio.request(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: options,
    );
  }
}
