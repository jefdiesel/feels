class Message {
  final String id;
  final String matchId;
  final String senderId;
  final String? content;
  final String? encryptedContent;
  final String? imageUrl;
  final DateTime createdAt;
  final DateTime? readAt;

  const Message({
    required this.id,
    required this.matchId,
    required this.senderId,
    this.content,
    this.encryptedContent,
    this.imageUrl,
    required this.createdAt,
    this.readAt,
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
    );
  }

  bool get isRead => readAt != null;

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
