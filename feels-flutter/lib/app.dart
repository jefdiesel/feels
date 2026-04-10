import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/router.dart';
import 'core/theme/theme.dart';

/// Root widget for the feels app.
///
/// Uses [MaterialApp.router] with go_router for navigation
/// and the feels dark theme.
class FeelsApp extends ConsumerWidget {
  const FeelsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'feels',
      debugShowCheckedModeBanner: false,
      theme: feelsTheme(),
      routerConfig: router,
    );
  }
}
