enum MessageStatus {
  sending,
  sent,
  delivered,
  read,
  failed,
}

class ImageStatus {
  final bool youEnabled;
  final bool theyEnabled;
  final bool bothEnabled;

  const ImageStatus({
    required this.youEnabled,
    required this.theyEnabled,
    required this.bothEnabled,
  });

  factory ImageStatus.fromJson(Map<String, dynamic> json) {
    return ImageStatus(
      youEnabled: json['you_enabled'] as bool? ?? false,
      theyEnabled: json['they_enabled'] as bool? ?? false,
      bothEnabled: json['both_enabled'] as bool? ?? false,
    );
  }

  static const none = ImageStatus(
    youEnabled: false,
    theyEnabled: false,
    bothEnabled: false,
  );
}

class Message {
  final String id;
  final String matchId;
  final String senderId;
  final String? content;
  final String? encryptedContent;
  final String? imageUrl;
  final DateTime createdAt;
  final DateTime? readAt;
  final MessageStatus status;

  const Message({
    required this.id,
    required this.matchId,
    required this.senderId,
    this.content,
    this.encryptedContent,
    this.imageUrl,
    required this.createdAt,
    this.readAt,
    this.status = MessageStatus.delivered,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'] as String,
      matchId: json['match_id'] as String,
      senderId: json['sender_id'] as String,
      content: json['content'] as String?,
      encryptedContent: json['encrypted_content'] as String?,
      imageUrl: json['image_url'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      readAt: json['read_at'] != null
          ? DateTime.parse(json['read_at'] as String)
          : null,
      status: json['read_at'] != null
          ? MessageStatus.read
          : MessageStatus.delivered,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'match_id': matchId,
      'sender_id': senderId,
      if (content != null) 'content': content,
      if (encryptedContent != null) 'encrypted_content': encryptedContent,
      if (imageUrl != null) 'image_url': imageUrl,
      'created_at': createdAt.toIso8601String(),
      if (readAt != null) 'read_at': readAt!.toIso8601String(),
    };
  }

  Message copyWith({
    String? id,
    String? matchId,
    String? senderId,
    String? content,
    String? encryptedContent,
    String? imageUrl,
    DateTime? createdAt,
    DateTime? readAt,
    MessageStatus? status,
  }) {
    return Message(
      id: id ?? this.id,
      matchId: matchId ?? this.matchId,
      senderId: senderId ?? this.senderId,
      content: content ?? this.content,
      encryptedContent: encryptedContent ?? this.encryptedContent,
      imageUrl: imageUrl ?? this.imageUrl,
      createdAt: createdAt ?? this.createdAt,
      readAt: readAt ?? this.readAt,
      status: status ?? this.status,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Message && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() =>
      'Message(id: $id, matchId: $matchId, senderId: $senderId)';
}

class MessagesResponse {
  final List<Message> messages;
  final bool hasMore;
  final ImageStatus imageStatus;

  const MessagesResponse({
    required this.messages,
    required this.hasMore,
    required this.imageStatus,
  });

  factory MessagesResponse.fromJson(Map<String, dynamic> json) {
    return MessagesResponse(
      messages: (json['messages'] as List<dynamic>?)
              ?.map((e) => Message.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      hasMore: json['has_more'] as bool? ?? false,
      imageStatus: json['image_status'] != null
          ? ImageStatus.fromJson(json['image_status'] as Map<String, dynamic>)
          : ImageStatus.none,
    );
  }
}
