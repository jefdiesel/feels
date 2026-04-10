import 'dart:io' as io;

import '../domain/models/message.dart';
import 'chat_api.dart';

class ChatRepository {
  final ChatApi _api;

  /// Per-conversation message caches, keyed by matchId.
  final Map<String, List<Message>> _messageCache = {};

  /// Per-conversation image status cache.
  final Map<String, ImageStatus> _imageStatusCache = {};

  /// Per-conversation hasMore flag.
  final Map<String, bool> _hasMoreCache = {};

  ChatRepository({required ChatApi api}) : _api = api;

  /// Fetch messages (initial load or pagination).
  Future<MessagesResponse> getMessages(
    String matchId, {
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await _api.getMessages(matchId, limit: limit, offset: offset);

    if (offset == 0) {
      _messageCache[matchId] = List.from(response.messages);
    } else {
      final existing = _messageCache[matchId] ?? [];
      final existingIds = existing.map((m) => m.id).toSet();
      final newMessages =
          response.messages.where((m) => !existingIds.contains(m.id)).toList();
      existing.addAll(newMessages);
      _messageCache[matchId] = existing;
    }

    _imageStatusCache[matchId] = response.imageStatus;
    _hasMoreCache[matchId] = response.hasMore;

    return response;
  }

  /// Optimistic send: returns a local placeholder immediately.
  /// Call [confirmSend] after the API succeeds, or [failSend] on error.
  Message optimisticSend({
    required String matchId,
    required String senderId,
    String? content,
    String? imageUrl,
    String? encryptedContent,
  }) {
    final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
    final optimistic = Message(
      id: tempId,
      matchId: matchId,
      senderId: senderId,
      content: content,
      encryptedContent: encryptedContent,
      imageUrl: imageUrl,
      createdAt: DateTime.now(),
      status: MessageStatus.sending,
    );

    final messages = _messageCache[matchId] ?? [];
    messages.insert(0, optimistic);
    _messageCache[matchId] = messages;

    return optimistic;
  }

  /// Send message to API. Returns the confirmed message from the server.
  Future<Message> sendMessage(
    String matchId, {
    String? content,
    String? imageUrl,
    String? encryptedContent,
  }) async {
    return _api.sendMessage(
      matchId,
      content: content,
      imageUrl: imageUrl,
      encryptedContent: encryptedContent,
    );
  }

  /// Replace the optimistic placeholder with the confirmed server message.
  void confirmSend(String matchId, String tempId, Message confirmed) {
    final messages = _messageCache[matchId];
    if (messages == null) return;
    final index = messages.indexWhere((m) => m.id == tempId);
    if (index != -1) {
      messages[index] = confirmed;
    }
  }

  /// Mark an optimistic message as failed.
  void failSend(String matchId, String tempId) {
    final messages = _messageCache[matchId];
    if (messages == null) return;
    final index = messages.indexWhere((m) => m.id == tempId);
    if (index != -1) {
      messages[index] = messages[index].copyWith(status: MessageStatus.failed);
    }
  }

  /// Add an incoming message from WebSocket.
  void addIncomingMessage(String matchId, Message message) {
    final messages = _messageCache[matchId] ?? [];
    // Avoid duplicates.
    if (messages.any((m) => m.id == message.id)) return;
    messages.insert(0, message);
    _messageCache[matchId] = messages;
  }

  /// Mark a message as delivered (from WS confirmation).
  void markDelivered(String matchId, String messageId) {
    final messages = _messageCache[matchId];
    if (messages == null) return;
    final index = messages.indexWhere((m) => m.id == messageId);
    if (index != -1) {
      messages[index] =
          messages[index].copyWith(status: MessageStatus.delivered);
    }
  }

  /// Mark a message as read.
  void markRead(String matchId, String messageId) {
    final messages = _messageCache[matchId];
    if (messages == null) return;
    final index = messages.indexWhere((m) => m.id == messageId);
    if (index != -1) {
      messages[index] = messages[index].copyWith(
        status: MessageStatus.read,
        readAt: DateTime.now(),
      );
    }
  }

  /// Get cached messages for a conversation.
  List<Message> getCachedMessages(String matchId) =>
      List.unmodifiable(_messageCache[matchId] ?? []);

  /// Get cached image status.
  ImageStatus getImageStatus(String matchId) =>
      _imageStatusCache[matchId] ?? ImageStatus.none;

  /// Whether there are more messages to load.
  bool hasMore(String matchId) => _hasMoreCache[matchId] ?? true;

  /// Enable images.
  Future<void> enableImages(String matchId) async {
    await _api.enableImages(matchId);
    final current = _imageStatusCache[matchId] ?? ImageStatus.none;
    _imageStatusCache[matchId] = ImageStatus(
      youEnabled: true,
      theyEnabled: current.theyEnabled,
      bothEnabled: current.theyEnabled,
    );
  }

  /// Disable images.
  Future<void> disableImages(String matchId) async {
    await _api.disableImages(matchId);
    final current = _imageStatusCache[matchId] ?? ImageStatus.none;
    _imageStatusCache[matchId] = ImageStatus(
      youEnabled: false,
      theyEnabled: current.theyEnabled,
      bothEnabled: false,
    );
  }

  /// Upload an image and return its URL.
  Future<String> uploadImage(String matchId, io.File file) async {
    return _api.uploadImage(matchId, file);
  }

  /// Send typing indicator.
  Future<void> sendTyping(String matchId, {required bool isTyping}) async {
    await _api.sendTyping(matchId, isTyping: isTyping);
  }

  /// Update image status from WebSocket events.
  void updateImageStatus(String matchId, ImageStatus status) {
    _imageStatusCache[matchId] = status;
  }

  /// Clear conversation cache.
  void clearConversation(String matchId) {
    _messageCache.remove(matchId);
    _imageStatusCache.remove(matchId);
    _hasMoreCache.remove(matchId);
  }
}
