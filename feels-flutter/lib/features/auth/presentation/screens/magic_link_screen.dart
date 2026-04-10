import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/theme.dart';
import '../providers/auth_provider.dart';

class MagicLinkScreen extends ConsumerStatefulWidget {
  final String email;

  const MagicLinkScreen({super.key, required this.email});

  @override
  ConsumerState<MagicLinkScreen> createState() => _MagicLinkScreenState();
}

class _MagicLinkScreenState extends ConsumerState<MagicLinkScreen> {
  static const _cooldownDuration = 60;

  int _cooldownSeconds = _cooldownDuration;
  Timer? _timer;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();
    _startCooldown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    _canResend = false;
    _cooldownSeconds = _cooldownDuration;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _cooldownSeconds--;
        if (_cooldownSeconds <= 0) {
          _canResend = true;
          timer.cancel();
        }
      });
    });
  }

  Future<void> _resend() async {
    if (!_canResend) return;
    try {
      await ref.read(authProvider.notifier).sendMagicLink(widget.email);
      if (mounted) {
        _startCooldown();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Magic link resent!'),
            backgroundColor: FeelsColors.primary,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      // Error surfaced via provider state.
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    // Navigate on authentication (token verified via login screen or deep link).
    // Use go() to replace entire stack — this screen is pushed on top of login.
    if (auth.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          context.go(auth.isNewUser ? '/onboarding' : '/home/feed');
        }
      });
    }

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const SizedBox(height: 16),

              // Back button row
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => context.pop(),
                  icon: const Icon(
                    Icons.arrow_back_ios,
                    size: 16,
                    color: FeelsColors.textSecondary,
                  ),
                  label: const Text(
                    'Use different email',
                    style: TextStyle(
                      color: FeelsColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                  ),
                ),
              ),

              const Spacer(),

              // Mail icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: FeelsColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.mail_outline_rounded,
                  size: 40,
                  color: FeelsColors.primary,
                ),
              ),
              const SizedBox(height: 32),

              // Title
              const Text(
                'Check your email',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w600,
                  color: FeelsColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              // Description
              Text(
                'We sent a magic link to',
                style: const TextStyle(
                  fontSize: 15,
                  color: FeelsColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                widget.email,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: FeelsColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Tap the link in the email to sign in.',
                style: TextStyle(
                  fontSize: 15,
                  color: FeelsColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 40),

              // Resend button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed:
                      (_canResend && !auth.isLoading) ? _resend : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: FeelsColors.primary,
                    side: BorderSide(
                      color: _canResend ? FeelsColors.primary : FeelsColors.border,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    disabledForegroundColor: FeelsColors.textSecondary,
                  ),
                  child: auth.isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            color: FeelsColors.primary,
                          ),
                        )
                      : Text(
                          _canResend
                              ? 'Resend Magic Link'
                              : 'Resend in ${_cooldownSeconds}s',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
              ),
              ),

              // Error
              if (auth.error != null) ...[
                const SizedBox(height: 16),
                Text(
                  auth.error!,
                  style: TextStyle(
                    color: Colors.red.shade300,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],

              const Spacer(),

              // Hint
              const Padding(
                padding: EdgeInsets.only(bottom: 32),
                child: Text(
                  'Didn\'t get it? Check your spam folder.',
                  style: TextStyle(
                    color: FeelsColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
