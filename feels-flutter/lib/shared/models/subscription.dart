class Plan {
  final String type;
  final String name;
  final String priceId;
  final int amount;
  final String currency;
  final String interval;
  final int intervalCount;
  final String description;

  const Plan({
    required this.type,
    required this.name,
    required this.priceId,
    required this.amount,
    required this.currency,
    required this.interval,
    required this.intervalCount,
    required this.description,
  });

  factory Plan.fromJson(Map<String, dynamic> json) {
    return Plan(
      type: json['type'] as String,
      name: json['name'] as String,
      priceId: json['price_id'] as String,
      amount: json['amount'] as int,
      currency: json['currency'] as String,
      interval: json['interval'] as String,
      intervalCount: json['interval_count'] as int,
      description: json['description'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'name': name,
      'price_id': priceId,
      'amount': amount,
      'currency': currency,
      'interval': interval,
      'interval_count': intervalCount,
      'description': description,
    };
  }

  /// Formatted price string (e.g. "$9.99")
  String get formattedPrice {
    final dollars = amount / 100;
    return '\$${dollars.toStringAsFixed(2)}';
  }

  @override
  String toString() => 'Plan(type: $type, name: $name, amount: $amount)';
}

class Subscription {
  final bool active;
  final String plan;
  final String period;
  final int creditsMonthly;
  final DateTime? expiresAt;
  final bool autoRenew;

  const Subscription({
    required this.active,
    required this.plan,
    required this.period,
    required this.creditsMonthly,
    this.expiresAt,
    required this.autoRenew,
  });

  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      active: json['active'] as bool,
      plan: json['plan'] as String,
      period: json['period'] as String,
      creditsMonthly: json['credits_monthly'] as int,
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'] as String)
          : null,
      autoRenew: json['auto_renew'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'active': active,
      'plan': plan,
      'period': period,
      'credits_monthly': creditsMonthly,
      if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
      'auto_renew': autoRenew,
    };
  }

  @override
  String toString() =>
      'Subscription(plan: $plan, active: $active, expiresAt: $expiresAt)';
}
