import '../../../../shared/models/profile.dart';

class LastMessage {
  final String content;
  final String senderId;
  final DateTime createdAt;

  const LastMessage({
    required this.content,
    required this.senderId,
    required this.createdAt,
  });

  factory LastMessage.fromJson(Map<String, dynamic> json) {
    return LastMessage(
      content: json['content'] as String? ?? '',
      senderId: json['sender_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'content': content,
      'sender_id': senderId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class MatchWithProfile {
  final String id;
  final Profile otherUser;
  final DateTime createdAt;
  final LastMessage? lastMessage;
  final int unreadCount;
  final bool imageEnabled;

  const MatchWithProfile({
    required this.id,
    required this.otherUser,
    required this.createdAt,
    this.lastMessage,
    required this.unreadCount,
    required this.imageEnabled,
  });

  factory MatchWithProfile.fromJson(Map<String, dynamic> json) {
    return MatchWithProfile(
      id: json['id'] as String,
      otherUser: Profile.fromJson(json['other_user'] as Map<String, dynamic>),
      createdAt: DateTime.parse(json['created_at'] as String),
      lastMessage: json['last_message'] != null
          ? LastMessage.fromJson(json['last_message'] as Map<String, dynamic>)
          : null,
      unreadCount: json['unread_count'] as int? ?? 0,
      imageEnabled: json['image_enabled'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'other_user': otherUser.toJson(),
      'created_at': createdAt.toIso8601String(),
      if (lastMessage != null) 'last_message': lastMessage!.toJson(),
      'unread_count': unreadCount,
      'image_enabled': imageEnabled,
    };
  }

  MatchWithProfile copyWith({
    String? id,
    Profile? otherUser,
    DateTime? createdAt,
    LastMessage? lastMessage,
    int? unreadCount,
    bool? imageEnabled,
  }) {
    return MatchWithProfile(
      id: id ?? this.id,
      otherUser: otherUser ?? this.otherUser,
      createdAt: createdAt ?? this.createdAt,
      lastMessage: lastMessage ?? this.lastMessage,
      unreadCount: unreadCount ?? this.unreadCount,
      imageEnabled: imageEnabled ?? this.imageEnabled,
    );
  }

  /// Sort key: last message time, or match creation time if no messages yet.
  DateTime get sortTime => lastMessage?.createdAt ?? createdAt;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MatchWithProfile &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() =>
      'MatchWithProfile(id: $id, otherUser: ${otherUser.name})';
}
