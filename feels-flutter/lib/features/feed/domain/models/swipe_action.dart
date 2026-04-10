enum SwipeAction {
  like,
  pass,
  superlike;

  String get apiPath {
    switch (this) {
      case SwipeAction.like:
        return 'like';
      case SwipeAction.pass:
        return 'pass';
      case SwipeAction.superlike:
        return 'superlike';
    }
  }
}

class SwipeResult {
  final bool matched;
  final String? matchId;
  final bool? requiresPremium;
  final String? premiumReason;

  const SwipeResult({
    required this.matched,
    this.matchId,
    this.requiresPremium,
    this.premiumReason,
  });

  factory SwipeResult.fromJson(Map<String, dynamic> json) {
    return SwipeResult(
      matched: json['matched'] as bool? ?? false,
      matchId: json['match_id'] as String?,
      requiresPremium: json['requires_premium'] as bool?,
      premiumReason: json['premium_reason'] as String?,
    );
  }

  factory SwipeResult.pass() => const SwipeResult(matched: false);
}

class FeedResponse {
  final List<dynamic> profiles;
  final bool hasMore;
  final int queuedLikes;
  final bool mustProcessAll;

  const FeedResponse({
    required this.profiles,
    required this.hasMore,
    required this.queuedLikes,
    required this.mustProcessAll,
  });
}
