import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/endpoints.dart';
import '../storage/secure_storage.dart';
import 'ws_events.dart';

/// Provides the singleton [WsManager] via Riverpod.
final wsManagerProvider = Provider<WsManager>((ref) {
  final storage = ref.read(secureStorageProvider);
  final manager = WsManager(storage: storage);
  ref.onDispose(() => manager.dispose());
  return manager;
});

/// Persistent WebSocket connection manager.
///
/// Features:
/// - Single connection per app session
/// - Exponential backoff reconnect (1s, 2s, 4s, 8s, max 30s)
/// - Reconnect on app foreground via [WidgetsBindingObserver]
/// - Typed event stream via [StreamController]
/// - JWT auth header on connect
/// - Ping/pong keepalive every 30s
/// - Outbound message queue during disconnect, flushed on reconnect
class WsManager with WidgetsBindingObserver {
  WsManager({required SecureStorageService storage}) : _storage = storage {
    WidgetsBinding.instance.addObserver(this);
  }

  final SecureStorageService _storage;

  WebSocket? _socket;
  Timer? _pingTimer;
  Timer? _reconnectTimer;

  final _eventController = StreamController<WsEvent>.broadcast();
  final _outboundQueue = <String>[];

  int _reconnectAttempt = 0;
  bool _intentionalDisconnect = false;
  bool _isConnecting = false;

  static const Duration _pingInterval = Duration(seconds: 30);
  static const Duration _maxBackoff = Duration(seconds: 30);

  /// Stream of typed WebSocket events for the rest of the app.
  Stream<WsEvent> get events => _eventController.stream;

  /// Whether the WebSocket is currently connected.
  bool get isConnected => _socket != null && _socket!.readyState == WebSocket.open;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /// Establish the WebSocket connection.
  Future<void> connect() async {
    if (_isConnecting || isConnected) return;
    _intentionalDisconnect = false;
    await _connect();
  }

  /// Gracefully close the connection. Will not auto-reconnect.
  Future<void> disconnect() async {
    _intentionalDisconnect = true;
    _cancelTimers();
    await _socket?.close(WebSocketStatus.normalClosure);
    _socket = null;
  }

  /// Tear down everything. Called when the provider is disposed.
  void dispose() {
    _intentionalDisconnect = true;
    _cancelTimers();
    _socket?.close(WebSocketStatus.goingAway);
    _socket = null;
    _eventController.close();
    WidgetsBinding.instance.removeObserver(this);
  }

  // ---------------------------------------------------------------------------
  // Send
  // ---------------------------------------------------------------------------

  /// Send a JSON message. Queues if disconnected — flushed on reconnect.
  void send(Map<String, dynamic> message) {
    final encoded = jsonEncode(message);
    if (isConnected) {
      _socket!.add(encoded);
    } else {
      _outboundQueue.add(encoded);
    }
  }

  // ---------------------------------------------------------------------------
  // App lifecycle observer
  // ---------------------------------------------------------------------------

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_intentionalDisconnect) {
      // Reconnect when app comes to foreground.
      if (!isConnected && !_isConnecting) {
        _reconnectAttempt = 0;
        _connect();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal connection logic
  // ---------------------------------------------------------------------------

  Future<void> _connect() async {
    _isConnecting = true;

    try {
      final token = await _storage.getAccessToken();
      if (token == null || token.isEmpty) {
        _isConnecting = false;
        return;
      }

      final uri = '${Env.wsBaseUrl}${Endpoints.ws}';

      _socket = await WebSocket.connect(
        uri,
        headers: {'Authorization': 'Bearer $token'},
      );

      _isConnecting = false;
      _reconnectAttempt = 0;

      _startPing();
      _flushOutboundQueue();

      _socket!.listen(
        _onData,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );
    } catch (e) {
      _isConnecting = false;
      _scheduleReconnect();
    }
  }

  void _onData(dynamic data) {
    if (data is! String) return;

    // Handle pong — server sends back {"type":"pong"}
    // No action needed, the fact we received data means the connection is alive.

    try {
      final json = jsonDecode(data) as Map<String, dynamic>;
      final event = WsEvent.fromJson(json);
      if (event != null) {
        _eventController.add(event);
      }
    } catch (_) {
      // Ignore malformed messages.
    }
  }

  void _onError(dynamic error) {
    // Connection error — will trigger onDone.
  }

  void _onDone() {
    _socket = null;
    _cancelTimers();
    if (!_intentionalDisconnect) {
      _scheduleReconnect();
    }
  }

  // ---------------------------------------------------------------------------
  // Ping/Pong keepalive
  // ---------------------------------------------------------------------------

  void _startPing() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(_pingInterval, (_) {
      if (isConnected) {
        _socket!.add(jsonEncode({'type': 'ping'}));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Reconnect with exponential backoff
  // ---------------------------------------------------------------------------

  void _scheduleReconnect() {
    if (_intentionalDisconnect) return;

    _reconnectTimer?.cancel();

    final backoffMs = min(
      1000 * pow(2, _reconnectAttempt).toInt(),
      _maxBackoff.inMilliseconds,
    );
    _reconnectAttempt++;

    _reconnectTimer = Timer(Duration(milliseconds: backoffMs), () {
      if (!_intentionalDisconnect && !isConnected && !_isConnecting) {
        _connect();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Outbound queue flush
  // ---------------------------------------------------------------------------

  void _flushOutboundQueue() {
    if (!isConnected || _outboundQueue.isEmpty) return;

    for (final message in _outboundQueue) {
      _socket!.add(message);
    }
    _outboundQueue.clear();
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  void _cancelTimers() {
    _pingTimer?.cancel();
    _pingTimer = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
  }
}
