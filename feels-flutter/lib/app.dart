import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/router.dart';
import 'core/theme/theme.dart';
import 'core/websocket/ws_dispatcher.dart';
import 'core/websocket/ws_manager.dart';
import 'features/auth/presentation/providers/auth_provider.dart';

/// Root widget for the feels app.
///
/// Uses [MaterialApp.router] with go_router for navigation and the feels dark
/// theme. Also owns the app-wide realtime layer: a single WebSocket connection
/// and the global [WsDispatcher], brought up and down with the auth session so
/// the inbox stays live without opening a conversation.
class FeelsApp extends ConsumerStatefulWidget {
  const FeelsApp({super.key});

  @override
  ConsumerState<FeelsApp> createState() => _FeelsAppState();
}

class _FeelsAppState extends ConsumerState<FeelsApp> {
  @override
  Widget build(BuildContext context) {
    // Connect the socket + start the inbox dispatcher when authenticated, and
    // tear them down on logout. FeelsApp builds before the splash restores the
    // session, so the initial false->true transition is always caught here.
    ref.listen<bool>(
      authProvider.select((s) => s.isAuthenticated),
      (_, isAuthenticated) {
        final ws = ref.read(wsManagerProvider);
        if (isAuthenticated) {
          ws.connect();
          ref.read(wsDispatcherProvider).start();
        } else {
          ref.read(wsDispatcherProvider).stop();
          ws.disconnect();
        }
      },
    );

    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'feels',
      debugShowCheckedModeBanner: false,
      theme: feelsTheme(),
      scaffoldMessengerKey: feelsScaffoldMessengerKey,
      routerConfig: router,
    );
  }
}
