import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

const _bgColor = Color(0xFF0A0A0A);
const _primaryColor = Color(0xFFE85D75);

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fadeController;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeIn,
    );
    _fadeController.forward();

    // Delay to next frame to avoid modifying providers during build
    Future.microtask(() => _checkAuth());
  }

  Future<void> _checkAuth() async {
    // Debug: pass --dart-define=DEV_TOKEN=<jwt> and DEV_REFRESH=<refresh> to skip login
    const devToken = String.fromEnvironment('DEV_TOKEN');
    const devRefresh = String.fromEnvironment('DEV_REFRESH');
    if (devToken.isNotEmpty) {
      await ref.read(authProvider.notifier).loginWithTokens(devToken, devRefresh);
      if (!mounted) return;
      context.go('/home/feed');
      return;
    }

    await ref.read(authProvider.notifier).loadSession();
    if (!mounted) return;

    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    final state = ref.read(authProvider);
    if (state.isAuthenticated) {
      if (state.isNewUser) {
        context.go('/onboarding');
      } else {
        context.go('/home/feed');
      }
    } else {
      context.go('/auth');
    }
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: const Text(
            'feels',
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.w600,
              color: _primaryColor,
              letterSpacing: -0.5,
            ),
          ),
        ),
      ),
    );
  }
}
