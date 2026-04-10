import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/magic_link_screen.dart';
import '../../features/feed/presentation/screens/feed_screen.dart';
import '../../features/matches/presentation/screens/matches_screen.dart';
import '../../features/chat/presentation/screens/conversation_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/preferences_screen.dart';
import '../../features/onboarding/presentation/screens/onboarding_screen.dart';
import '../../features/premium/presentation/screens/premium_screen.dart';
import '../../shared/widgets/settings_screen.dart';
import '../../shared/widgets/bottom_nav.dart';
// ---------------------------------------------------------------------------
// Route paths
// ---------------------------------------------------------------------------

class RoutePaths {
  RoutePaths._();

  static const String splash = '/';
  static const String auth = '/auth';
  static const String onboarding = '/onboarding';
  static const String home = '/home';
  static const String feed = '/home/feed';
  static const String matches = '/home/matches';
  static const String chat = '/home/chat';
  static const String profile = '/home/profile';
  static const String settings = '/settings';
  static const String premium = '/premium';
  static const String preferences = '/preferences';
}

// ---------------------------------------------------------------------------
// Router provider
// ---------------------------------------------------------------------------

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RoutePaths.splash,
    debugLogDiagnostics: false, // Set true only in debug builds
    routes: [
      // Splash — checks auth and navigates
      GoRoute(
        path: RoutePaths.splash,
        name: 'splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // Auth
      GoRoute(
        path: RoutePaths.auth,
        name: 'auth',
        builder: (context, state) => const LoginScreen(),
        routes: [
          GoRoute(
            path: 'magic',
            name: 'magic-link',
            builder: (context, state) {
              final email = state.uri.queryParameters['email'] ?? '';
              return MagicLinkScreen(email: email);
            },
          ),
        ],
      ),

      // Onboarding (new users)
      GoRoute(
        path: RoutePaths.onboarding,
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),

      // Main app — shell route with bottom navigation
      ShellRoute(
        builder: (context, state, child) {
          return _ShellScaffold(state: state, child: child);
        },
        routes: [
          GoRoute(
            path: RoutePaths.feed,
            name: 'feed',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: FeedScreen(),
            ),
          ),
          GoRoute(
            path: RoutePaths.matches,
            name: 'matches',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MatchesScreen(),
            ),
          ),
          GoRoute(
            path: '${RoutePaths.chat}/:id',
            name: 'chat',
            builder: (context, state) {
              final matchId = state.pathParameters['id']!;
              return ConversationScreen(
                matchId: matchId,
                matchName: state.uri.queryParameters['name'] ?? '',
                currentUserId: '',
              );
            },
          ),
          GoRoute(
            path: RoutePaths.profile,
            name: 'profile',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),

      // Modal routes (outside shell)
      GoRoute(
        path: RoutePaths.settings,
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: RoutePaths.premium,
        name: 'premium',
        builder: (context, state) => const PremiumScreen(),
      ),
      GoRoute(
        path: RoutePaths.preferences,
        name: 'preferences',
        builder: (context, state) => const PreferencesScreen(),
      ),
    ],
  );
});

// ---------------------------------------------------------------------------
// Bottom nav shell
// ---------------------------------------------------------------------------

class _ShellScaffold extends StatelessWidget {
  const _ShellScaffold({required this.state, required this.child});

  final GoRouterState state;
  final Widget child;

  int _currentIndex(String location) {
    if (location.startsWith(RoutePaths.matches)) return 1;
    if (location.startsWith('${RoutePaths.chat}/')) return 1;
    if (location.startsWith(RoutePaths.profile)) return 2;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = state.uri.path;
    final index = _currentIndex(location);
    final isChat = location.startsWith('${RoutePaths.chat}/');

    return Scaffold(
      body: child,
      bottomNavigationBar: isChat ? null : FeelsBottomNav(
        currentIndex: index,
        onTap: (i) {
          switch (i) {
            case 0:
              context.go(RoutePaths.feed);
            case 1:
              context.go(RoutePaths.matches);
            case 2:
              context.go(RoutePaths.profile);
          }
        },
      ),
    );
  }
}
