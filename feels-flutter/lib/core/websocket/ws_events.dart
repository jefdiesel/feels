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
    return NewMessageEvent(
      matchId: payload['match_id'] as String,
      message: payload['message'] as Map<String, dynamic>,
    );
  }
}

class MessageReadEvent extends WsEvent {
  const MessageReadEvent({
    required this.matchId,
    required this.messageId,
  });

  final String matchId;
  final String messageId;

  factory MessageReadEvent.fromPayload(Map<String, dynamic> payload) {
    return MessageReadEvent(
      matchId: payload['match_id'] as String,
      messageId: payload['message_id'] as String,
    );
  }
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
