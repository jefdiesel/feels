import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../../core/theme/theme.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _tokenController = TextEditingController();
  final _pwEmailController = TextEditingController();
  final _pwPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _showPasswordLogin = false;

  @override
  void dispose() {
    _emailController.dispose();
    _tokenController.dispose();
    _pwEmailController.dispose();
    _pwPasswordController.dispose();
    super.dispose();
  }

  Future<void> _passwordLogin() async {
    final email = _pwEmailController.text.trim();
    final password = _pwPasswordController.text;
    if (email.isEmpty || password.isEmpty) return;
    HapticFeedback.lightImpact();
    try {
      await ref.read(authProvider.notifier).passwordLogin(
            email: email,
            password: password,
          );
    } catch (_) {}
  }

  Future<void> _loginWithToken() async {
    final token = _tokenController.text.trim();
    if (token.isEmpty) return;
    try {
      await ref.read(authProvider.notifier).verifyMagicLink(token);
    } catch (_) {}
  }

  Future<void> _sendMagicLink() async {
    if (!_formKey.currentState!.validate()) return;

    HapticFeedback.lightImpact();

    final email = _emailController.text.trim();
    try {
      await ref.read(authProvider.notifier).sendMagicLink(email);
      if (mounted) {
        context.push('/auth/magic?email=${Uri.encodeComponent(email)}');
      }
    } catch (_) {
      // Error is surfaced via authProvider state.
    }
  }

  Future<void> _signInWithApple() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final identityToken = credential.identityToken;
      if (identityToken == null) {
        ref.read(authProvider.notifier).clearError();
        return;
      }

      String? fullName;
      if (credential.givenName != null || credential.familyName != null) {
        fullName = [credential.givenName, credential.familyName]
            .where((s) => s != null && s.isNotEmpty)
            .join(' ');
        if (fullName.isEmpty) fullName = null;
      }

      await ref.read(authProvider.notifier).appleAuth(
            identityToken: identityToken,
            userId: credential.userIdentifier ?? '',
            email: credential.email,
            fullName: fullName,
          );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) return;
      // Other Apple errors are not rethrowing — we show a generic message.
    } catch (_) {
      // Handled by provider state.
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    // Navigate on authentication.
    ref.listen<AuthState>(authProvider, (prev, next) {
      if (next.isAuthenticated && !(prev?.isAuthenticated ?? false)) {
        HapticFeedback.mediumImpact();
        if (next.isNewUser) {
          context.go('/onboarding');
        } else {
          context.go('/home/feed');
        }
      }
    });

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Logo
                  const Text(
                    'feels',
                    style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.w600,
                      color: FeelsColors.primary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Tagline
                  const Text(
                    'the dating app that puts\nreal connections first',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      color: FeelsColors.textSecondary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Email input
                  SizedBox(
                    height: 48,
                    child: TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _sendMagicLink(),
                      style: const TextStyle(
                        color: FeelsColors.textPrimary,
                        fontSize: 16,
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Enter your email';
                        }
                        final emailRegex = RegExp(
                          r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
                        );
                        if (!emailRegex.hasMatch(value.trim())) {
                          return 'Enter a valid email';
                        }
                        return null;
                      },
                      decoration: InputDecoration(
                        hintText: 'Email address',
                        hintStyle: const TextStyle(
                          color: FeelsColors.textSecondary,
                          fontSize: 16,
                        ),
                        filled: true,
                        fillColor: FeelsColors.bgTertiary,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: FeelsColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: FeelsColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: FeelsColors.primary,
                            width: 1.5,
                          ),
                        ),
                        errorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.red.shade400,
                          ),
                        ),
                        focusedErrorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: Colors.red.shade400,
                            width: 1.5,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Send Magic Link button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: auth.isLoading ? null : _sendMagicLink,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: FeelsColors.primary,
                        disabledBackgroundColor: FeelsColors.primary.withValues(alpha: 0.5),
                        foregroundColor: FeelsColors.textPrimary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: auth.isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: FeelsColors.textPrimary,
                              ),
                            )
                          : const Text(
                              'Send Magic Link',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Divider
                  Row(
                    children: [
                      Expanded(
                        child: Container(height: 1, color: FeelsColors.border),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16),
                        child: Text(
                          'or',
                          style: TextStyle(
                            color: FeelsColors.textSecondary,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Container(height: 1, color: FeelsColors.border),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Sign in with Apple
                  if (Platform.isIOS)
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        onPressed: auth.isLoading ? null : _signInWithApple,
                        icon: const Icon(Icons.apple, size: 22),
                        label: const Text(
                          'Sign in with Apple',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: FeelsColors.textPrimary,
                          foregroundColor: Colors.black,
                          disabledBackgroundColor:
                              FeelsColors.textPrimary.withValues(alpha: 0.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),

                  // Debug: paste token directly (dev only)
                  if (const bool.fromEnvironment('dart.vm.product') == false) ...[
                    const SizedBox(height: 32),
                    SizedBox(
                      height: 48,
                      child: TextField(
                        controller: _tokenController,
                        style: const TextStyle(color: FeelsColors.textPrimary, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Paste magic link token (debug)',
                          hintStyle: const TextStyle(color: FeelsColors.textDisabled, fontSize: 13),
                          filled: true,
                          fillColor: FeelsColors.bgTertiary,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FeelsColors.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: FeelsColors.border),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 40,
                      child: ElevatedButton(
                        onPressed: auth.isLoading ? null : _loginWithToken,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: FeelsColors.bgTertiary,
                          foregroundColor: FeelsColors.textSecondary,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        child: const Text('Login with Token', style: TextStyle(fontSize: 13)),
                      ),
                    ),
                  ],

                  // Error display
                  if (auth.error != null) ...[
                    const SizedBox(height: 24),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade900.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.red.shade800.withValues(alpha: 0.5),
                        ),
                      ),
                      child: Text(
                        auth.error!,
                        style: TextStyle(
                          color: Colors.red.shade300,
                          fontSize: 14,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],

                  const SizedBox(height: 32),

                  // Buried "Other login options" — for app store reviewers
                  // and legacy email/password users.
                  if (!_showPasswordLogin)
                    TextButton(
                      onPressed: () {
                        setState(() => _showPasswordLogin = true);
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: FeelsColors.textTertiary,
                        padding: EdgeInsets.zero,
                      ),
                      child: const Text(
                        'Other login options',
                        style: TextStyle(
                          fontSize: 12,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    )
                  else ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 48,
                      child: TextField(
                        controller: _pwEmailController,
                        keyboardType: TextInputType.emailAddress,
                        autocorrect: false,
                        style: const TextStyle(
                          color: FeelsColors.textPrimary,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Email',
                          hintStyle: const TextStyle(
                            color: FeelsColors.textSecondary,
                            fontSize: 14,
                          ),
                          filled: true,
                          fillColor: FeelsColors.bgTertiary,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: FeelsColors.border,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: FeelsColors.border,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: FeelsColors.primary,
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 48,
                      child: TextField(
                        controller: _pwPasswordController,
                        obscureText: true,
                        style: const TextStyle(
                          color: FeelsColors.textPrimary,
                          fontSize: 14,
                        ),
                        decoration: InputDecoration(
                          hintText: 'Password',
                          hintStyle: const TextStyle(
                            color: FeelsColors.textSecondary,
                            fontSize: 14,
                          ),
                          filled: true,
                          fillColor: FeelsColors.bgTertiary,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: FeelsColors.border,
                            ),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: FeelsColors.border,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                              color: FeelsColors.primary,
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        onPressed: auth.isLoading ? null : _passwordLogin,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: FeelsColors.textPrimary,
                          side: const BorderSide(color: FeelsColors.border),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Log in',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () {
                        setState(() => _showPasswordLogin = false);
                      },
                      style: TextButton.styleFrom(
                        foregroundColor: FeelsColors.textTertiary,
                        padding: EdgeInsets.zero,
                      ),
                      child: const Text(
                        'Hide',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  // Footer
                  const Text(
                    'By continuing, you agree to our Terms of Service\nand Privacy Policy',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: FeelsColors.textSecondary,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
