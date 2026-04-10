class CreditBalance {
  final int balance;
  final int bonusLikes;
  final int dailyLikesUsed;
  final int dailyLikesLimit;
  final int premiumLikesUsed;
  final int premiumLikesLimit;
  final int boostsUsed;
  final int boostsLimit;
  final bool hasSubscription;

  const CreditBalance({
    required this.balance,
    required this.bonusLikes,
    required this.dailyLikesUsed,
    required this.dailyLikesLimit,
    required this.premiumLikesUsed,
    required this.premiumLikesLimit,
    required this.boostsUsed,
    required this.boostsLimit,
    required this.hasSubscription,
  });

  factory CreditBalance.fromJson(Map<String, dynamic> json) {
    return CreditBalance(
      balance: json['balance'] as int? ?? 0,
      bonusLikes: json['bonus_likes'] as int? ?? 0,
      dailyLikesUsed: json['daily_likes_used'] as int? ?? 0,
      dailyLikesLimit: json['daily_likes_limit'] as int? ?? 0,
      premiumLikesUsed: json['premium_likes_used'] as int? ?? 0,
      premiumLikesLimit: json['premium_likes_limit'] as int? ?? 0,
      boostsUsed: json['boosts_used'] as int? ?? 0,
      boostsLimit: json['boosts_limit'] as int? ?? 0,
      hasSubscription: json['has_subscription'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'balance': balance,
      'bonus_likes': bonusLikes,
      'daily_likes_used': dailyLikesUsed,
      'daily_likes_limit': dailyLikesLimit,
      'premium_likes_used': premiumLikesUsed,
      'premium_likes_limit': premiumLikesLimit,
      'boosts_used': boostsUsed,
      'boosts_limit': boostsLimit,
      'has_subscription': hasSubscription,
    };
  }

  int get dailyLikesRemaining => dailyLikesLimit - dailyLikesUsed;
  int get premiumLikesRemaining => premiumLikesLimit - premiumLikesUsed;
  int get totalLikesRemaining =>
      dailyLikesRemaining + premiumLikesRemaining + bonusLikes;

  @override
  String toString() =>
      'CreditBalance(balance: $balance, dailyLikes: $dailyLikesUsed/$dailyLikesLimit, subscription: $hasSubscription)';
}
