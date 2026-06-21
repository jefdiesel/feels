/// Typed WebSocket event models for the feels real-time protocol.
///
/// All server->client events follow the format:
///   {"type": "event_name", "payload": {...}}

sealed class WsEvent {
  const WsEvent();

  /// Parses a raw JSON map into a typed [WsEvent].
  /// Returns null for unrecognized event types.
  static WsEvent? fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String?;
    final payload = json['payload'] as Map<String, dynamic>? ?? {};

    return switch (type) {
      'new_message' => NewMessageEvent.fromPayload(payload),
      'message_read' => MessageReadEvent.fromPayload(payload),
      'typing_start' => TypingStartEvent.fromPayload(payload),
      'typing_stop' => TypingStopEvent.fromPayload(payload),
      'image_enabled' => ImageEnabledEvent.fromPayload(payload),
      'image_disabled' => ImageDisabledEvent.fromPayload(payload),
      'match_created' => MatchCreatedEvent.fromPayload(payload),
      'match_deleted' => MatchDeletedEvent.fromPayload(payload),
      _ => null,
    };
  }
}

class NewMessageEvent extends WsEvent {
  const NewMessageEvent({
    required this.matchId,
    required this.message,
  });

  final String matchId;

  /// Raw message JSON — consumers should parse into their Message model.
  final Map<String, dynamic> message;

  factory NewMessageEvent.fromPayload(Map<String, dynamic> payload) {
    // Server sends {"message": {...}} with match_id INSIDE the message object,
    // not at the payload top level.
    final message = payload['message'] as Map<String, dynamic>;
    return NewMessageEvent(
      matchId: message['match_id'] as String,
      message: message,
    );
  }
}

class MessageReadEvent extends WsEvent {
  const MessageReadEvent({
    required this.matchId,
    required this.readerId,
  });

  final String matchId;

  /// The user who read the messages (the other person). Server marks ALL of
  /// their unread messages read at once and reports the reader, not a single id.
  final String readerId;

  factory MessageReadEvent.fromPayload(Map<String, dynamic> payload) {
    return MessageReadEvent(
      matchId: payload['match_id'] as String,
      readerId: payload['reader_id'] as String,
    );
  }
}

/// Synthetic client-side event emitted by [WsManager] when the socket
/// (re)connects — lets open screens resync anything missed while offline.
class WsConnectedEvent extends WsEvent {
  const WsConnectedEvent();
}

class TypingStartEvent extends WsEvent {
  const TypingStartEvent({
    required this.matchId,
    required this.userId,
  });

  final String matchId;
  final String userId;

  factory TypingStartEvent.fromPayload(Map<String, dynamic> payload) {
    return TypingStartEvent(
      matchId: payload['match_id'] as String,
      userId: payload['user_id'] as String,
    );
  }
}

class TypingStopEvent extends WsEvent {
  const TypingStopEvent({
    required this.matchId,
    required this.userId,
  });

  final String matchId;
  final String userId;

  factory TypingStopEvent.fromPayload(Map<String, dynamic> payload) {
    return TypingStopEvent(
      matchId: payload['match_id'] as String,
      userId: payload['user_id'] as String,
    );
  }
}

class ImageEnabledEvent extends WsEvent {
  const ImageEnabledEvent({
    required this.matchId,
    required this.userId,
  });

  final String matchId;
  final String userId;

  factory ImageEnabledEvent.fromPayload(Map<String, dynamic> payload) {
    return ImageEnabledEvent(
      matchId: payload['match_id'] as String,
      userId: payload['user_id'] as String,
    );
  }
}

class ImageDisabledEvent extends WsEvent {
  const ImageDisabledEvent({
    required this.matchId,
    required this.userId,
  });

  final String matchId;
  final String userId;

  factory ImageDisabledEvent.fromPayload(Map<String, dynamic> payload) {
    return ImageDisabledEvent(
      matchId: payload['match_id'] as String,
      userId: payload['user_id'] as String,
    );
  }
}

class MatchCreatedEvent extends WsEvent {
  const MatchCreatedEvent({
    required this.matchId,
    required this.otherUserId,
  });

  final String matchId;
  final String otherUserId;

  factory MatchCreatedEvent.fromPayload(Map<String, dynamic> payload) {
    return MatchCreatedEvent(
      matchId: payload['match_id'] as String,
      otherUserId: payload['other_user_id'] as String,
    );
  }
}

class MatchDeletedEvent extends WsEvent {
  const MatchDeletedEvent({required this.matchId});

  final String matchId;

  factory MatchDeletedEvent.fromPayload(Map<String, dynamic> payload) {
    return MatchDeletedEvent(
      matchId: payload['match_id'] as String,
    );
  }
}
