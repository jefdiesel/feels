import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/auth_repository.dart';

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final bool isNewUser;
  final String? error;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = false,
    this.isNewUser = false,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    bool? isNewUser,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      isNewUser: isNewUser ?? this.isNewUser,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repo;

  AuthNotifier(this._repo) : super(const AuthState());

  String? get accessToken => _repo.accessToken;

  /// Debug: skip login by injecting tokens directly.
  Future<void> loginWithTokens(String accessToken, String refreshToken) async {
    await _repo.saveTokens(accessToken, refreshToken);
    state = state.copyWith(isAuthenticated: true);
  }

  /// Called once on app start from the splash screen.
  Future<void> loadSession() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final authenticated = await _repo.loadSession();
      state = state.copyWith(
        isAuthenticated: authenticated,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isAuthenticated: false,
        isLoading: false,
        error: _extractError(e),
      );
    }
  }

  /// Send a magic link to [email]. Does not change auth state — the user still
  /// needs to click the link and verify.
  Future<void> sendMagicLink(String email) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repo.sendMagicLink(email);
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _extractError(e));
      rethrow;
    }
  }

  /// Verify a magic link [token] received via deep link.
  Future<void> verifyMagicLink(String token) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repo.verifyMagicLink(token);
      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        isNewUser: session.isNewUser,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _extractError(e));
    }
  }

  /// Authenticate via Apple Sign In.
  Future<void> appleAuth({
    required String identityToken,
    required String userId,
    String? email,
    String? fullName,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repo.appleAuth(
        identityToken: identityToken,
        userId: userId,
        email: email,
        fullName: fullName,
      );
      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        isNewUser: session.isNewUser,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _extractError(e));
    }
  }

  /// Email + password login (reviewer access).
  Future<void> passwordLogin({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final session = await _repo.passwordLogin(
        email: email,
        password: password,
      );
      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        isNewUser: session.isNewUser,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _extractError(e));
    }
  }

  /// Log the user out.
  Future<void> logout() async {
    await _repo.logout();
    state = const AuthState();
  }

  /// Delete account and clear session.
  Future<void> deleteAccount() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _repo.deleteAccount();
      state = const AuthState();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _extractError(e));
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  String _extractError(dynamic e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map<String, dynamic> && data.containsKey('error')) {
        return data['error'] as String;
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return 'Connection timed out. Please try again.';
      }
      if (e.type == DioExceptionType.connectionError) {
        return 'No internet connection.';
      }
      return e.message ?? 'Something went wrong.';
    }
    return e.toString();
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return AuthNotifier(repo);
});
