class Photo {
  final String id;
  final String userId;
  final String url;
  final int position;
  final DateTime createdAt;

  const Photo({
    required this.id,
    required this.userId,
    required this.url,
    required this.position,
    required this.createdAt,
  });

  factory Photo.fromJson(Map<String, dynamic> json) {
    return Photo(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      url: json['url'] as String,
      position: json['position'] as int,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'url': url,
      'position': position,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Photo copyWith({
    String? id,
    String? userId,
    String? url,
    int? position,
    DateTime? createdAt,
  }) {
    return Photo(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      url: url ?? this.url,
      position: position ?? this.position,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Photo && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Photo(id: $id, position: $position, url: $url)';
}
