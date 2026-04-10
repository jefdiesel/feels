import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../../../../core/theme/theme.dart';
import '../providers/subscription_provider.dart';
import '../providers/credits_provider.dart';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

class _HeroFeature {
  final IconData icon;
  final String name;
  final String description;

  const _HeroFeature({
    required this.icon,
    required this.name,
    required this.description,
  });
}

const _heroFeatures = [
  _HeroFeature(
    icon: Icons.favorite_rounded,
    name: 'Unlimited Likes',
    description: 'Never run out. Like everyone who catches your eye.',
  ),
  _HeroFeature(
    icon: Icons.visibility_rounded,
    name: 'See Who Likes You',
    description: "Skip the guessing. See everyone who's interested.",
  ),
  _HeroFeature(
    icon: Icons.replay_rounded,
    name: 'Rewind',
    description: 'Accidentally passed? Go back and match.',
  ),
];

enum _PlanType { monthly, quarterly, annual }

class _PlanInfo {
  final _PlanType type;
  final String name;
  final String totalPrice;
  final String perMonth;
  final String productId;
  final String? badge;
  final String? savings;

  const _PlanInfo({
    required this.type,
    required this.name,
    required this.totalPrice,
    required this.perMonth,
    required this.productId,
    this.badge,
    this.savings,
  });
}

const _plans = [
  _PlanInfo(
    type: _PlanType.monthly,
    name: 'Monthly',
    totalPrice: '\$14.99',
    perMonth: '\$14.99',
    productId: 'feels_monthly',
  ),
  _PlanInfo(
    type: _PlanType.quarterly,
    name: 'Quarterly',
    totalPrice: '\$29.99',
    perMonth: '\$10.00',
    productId: 'feels_quarterly',
    badge: 'BEST VALUE',
    savings: 'Save 33%',
  ),
  _PlanInfo(
    type: _PlanType.annual,
    name: 'Annual',
    totalPrice: '\$79.99',
    perMonth: '\$6.67',
    productId: 'feels_annual',
  ),
];

// Active subscriber features list
const _unlockedFeatures = [
  (Icons.favorite_rounded, 'Unlimited likes'),
  (Icons.visibility_rounded, 'See who likes you'),
  (Icons.replay_rounded, 'Rewind last swipe'),
  (Icons.visibility_off_rounded, 'Private mode'),
  (Icons.verified_rounded, 'Profile verification'),
  (Icons.bolt_rounded, 'Priority in the stack'),
];

// ---------------------------------------------------------------------------
// Premium Screen
// ---------------------------------------------------------------------------

class PremiumScreen extends ConsumerStatefulWidget {
  const PremiumScreen({super.key});

  @override
  ConsumerState<PremiumScreen> createState() => _PremiumScreenState();
}

class _PremiumScreenState extends ConsumerState<PremiumScreen>
    with TickerProviderStateMixin {
  bool _purchasing = false;
  String? _error;
  _PlanType _selectedPlan = _PlanType.quarterly;

  // Feature carousel
  late final PageController _pageController;
  int _currentPage = 0;

  // Animations
  late final AnimationController _glowController;
  late final Animation<double> _glowAnimation;
  late final AnimationController _ctaController;
  late final Animation<double> _ctaAnimation;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(viewportFraction: 0.85);

    // Pulsing glow on premium icon (2s cycle)
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _glowAnimation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );

    // Subtle pulse on CTA button (2s cycle, 1.0 → 1.01)
    _ctaController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _ctaAnimation = Tween<double>(begin: 1.0, end: 1.01).animate(
      CurvedAnimation(parent: _ctaController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    _glowController.dispose();
    _ctaController.dispose();
    super.dispose();
  }

  _PlanInfo get _selected => _plans.firstWhere((p) => p.type == _selectedPlan);

  @override
  Widget build(BuildContext context) {
    final subState = ref.watch(subscriptionProvider);

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      body: subState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => _buildError(),
        data: (state) {
          if (state.isActive) {
            return _buildActiveView(state);
          }
          return _buildPaywall();
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(FeelsSpacing.s5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Failed to load subscription info',
              style: FeelsTypography.body.copyWith(
                color: FeelsColors.textSecondary,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s4),
            ElevatedButton(
              onPressed: () =>
                  ref.read(subscriptionProvider.notifier).refresh(),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Already-subscribed view
  // ---------------------------------------------------------------------------

  Widget _buildActiveView(SubscriptionState state) {
    final sub = state.subscription!;
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final topPadding = MediaQuery.of(context).padding.top;

    return Column(
      children: [
        // Amber gradient header
        Container(
          width: double.infinity,
          padding: EdgeInsets.fromLTRB(
            FeelsLayout.screenPaddingHorizontal,
            topPadding + FeelsSpacing.s4,
            FeelsLayout.screenPaddingHorizontal,
            FeelsSpacing.s7,
          ),
          decoration: const BoxDecoration(
            gradient: FeelsGradients.secondary,
            borderRadius: BorderRadius.only(
              bottomLeft: Radius.circular(FeelsRadius.xl),
              bottomRight: Radius.circular(FeelsRadius.xl),
            ),
          ),
          child: Column(
            children: [
              // Close button row
              Align(
                alignment: Alignment.topLeft,
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ),
              const SizedBox(height: FeelsSpacing.s4),
              const Icon(
                Icons.workspace_premium_rounded,
                size: 64,
                color: Colors.white,
              ),
              const SizedBox(height: FeelsSpacing.s4),
              Text(
                "You're a feels+ member",
                style: FeelsTypography.h2.copyWith(color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: FeelsSpacing.s2),
              Text(
                '${sub.plan[0].toUpperCase()}${sub.plan.substring(1)} plan',
                style: FeelsTypography.body.copyWith(
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              ),
              if (sub.expiresAt != null) ...[
                const SizedBox(height: FeelsSpacing.s1),
                Text(
                  sub.autoRenew
                      ? 'Renews ${_formatDate(sub.expiresAt!)}'
                      : 'Expires ${_formatDate(sub.expiresAt!)}',
                  style: FeelsTypography.bodySmall.copyWith(
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ],
          ),
        ),

        // Unlocked features
        Expanded(
          child: ListView(
            padding: EdgeInsets.fromLTRB(
              FeelsLayout.screenPaddingHorizontal,
              FeelsSpacing.s6,
              FeelsLayout.screenPaddingHorizontal,
              bottomPadding + FeelsSpacing.s5,
            ),
            children: [
              Text(
                'YOUR FEATURES',
                style: FeelsTypography.caption.copyWith(
                  color: FeelsColors.textTertiary,
                  letterSpacing: FeelsTypography.letterSpacingWide,
                ),
              ),
              const SizedBox(height: FeelsSpacing.s4),
              ..._unlockedFeatures.map((f) => Padding(
                    padding: const EdgeInsets.only(bottom: FeelsSpacing.s3),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: FeelsColors.secondaryMuted,
                            borderRadius: FeelsRadius.smAll,
                          ),
                          child: Icon(
                            f.$1,
                            size: 20,
                            color: FeelsColors.secondary,
                          ),
                        ),
                        const SizedBox(width: FeelsSpacing.s3),
                        Expanded(
                          child: Text(f.$2, style: FeelsTypography.body),
                        ),
                        const Icon(
                          Icons.check_circle_rounded,
                          size: 20,
                          color: FeelsColors.success,
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),

        // Manage subscription button
        Padding(
          padding: EdgeInsets.fromLTRB(
            FeelsLayout.screenPaddingHorizontal,
            FeelsSpacing.s2,
            FeelsLayout.screenPaddingHorizontal,
            bottomPadding + FeelsSpacing.s4,
          ),
          child: OutlinedButton(
            onPressed: _purchasing ? null : _handleCancel,
            style: OutlinedButton.styleFrom(
              minimumSize:
                  const Size(double.infinity, FeelsLayout.buttonHeight),
              side: const BorderSide(color: FeelsColors.border),
            ),
            child: _purchasing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Manage Subscription'),
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Paywall
  // ---------------------------------------------------------------------------

  Widget _buildPaywall() {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final topPadding = MediaQuery.of(context).padding.top;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              children: [
                // Hero section with gradient
                _buildHeroSection(topPadding),

                const SizedBox(height: FeelsSpacing.s6),

                // Feature showcase (swipeable cards)
                _buildFeatureShowcase(),

                const SizedBox(height: FeelsSpacing.s5),

                // Social proof bar
                _buildSocialProof(),

                const SizedBox(height: FeelsSpacing.s6),

                // Pricing section
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: FeelsLayout.screenPaddingHorizontal,
                  ),
                  child: _buildPricingSection(),
                ),

                if (_error != null) ...[
                  const SizedBox(height: FeelsSpacing.s4),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: FeelsLayout.screenPaddingHorizontal,
                    ),
                    child: Text(
                      _error!,
                      style: FeelsTypography.bodySmall.copyWith(
                        color: FeelsColors.error,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],

                const SizedBox(height: FeelsSpacing.s5),

                // Legal text
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: FeelsLayout.screenPaddingHorizontal,
                  ),
                  child: Text(
                    'Payment will be charged to your '
                    '${Platform.isIOS ? 'Apple ID' : 'Google Play'} account. '
                    'Subscription auto-renews unless cancelled at least '
                    '24 hours before the end of the current period.',
                    style: FeelsTypography.caption.copyWith(
                      color: FeelsColors.textTertiary,
                      fontWeight: FeelsTypography.weightNormal,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

                SizedBox(height: bottomPadding + FeelsSpacing.s4),
              ],
            ),
          ),
        ),

        // Sticky CTA at bottom
        _buildCTASection(bottomPadding),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Hero section
  // ---------------------------------------------------------------------------

  Widget _buildHeroSection(double topPadding) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        FeelsLayout.screenPaddingHorizontal,
        topPadding + FeelsSpacing.s4,
        FeelsLayout.screenPaddingHorizontal,
        FeelsSpacing.s7,
      ),
      decoration: const BoxDecoration(
        gradient: FeelsGradients.primary,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(FeelsRadius.xl),
          bottomRight: Radius.circular(FeelsRadius.xl),
        ),
      ),
      child: Column(
        children: [
          // Close button
          Align(
            alignment: Alignment.topLeft,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white),
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
          const SizedBox(height: FeelsSpacing.s4),

          // Glowing premium icon
          AnimatedBuilder(
            animation: _glowAnimation,
            builder: (context, _) {
              return Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: FeelsColors.secondary
                          .withValues(alpha: 0.4 * _glowAnimation.value),
                      blurRadius: 24 * _glowAnimation.value,
                      spreadRadius: 4 * _glowAnimation.value,
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.workspace_premium_rounded,
                  size: 56,
                  color: Colors.white,
                ),
              );
            },
          ),

          const SizedBox(height: FeelsSpacing.s5),

          // Headline
          Text(
            'Get more from feels',
            style: FeelsTypography.h1.copyWith(color: Colors.white),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: FeelsSpacing.s2),

          // Subheadline
          Text(
            'Join thousands finding real connections',
            style: FeelsTypography.body.copyWith(
              color: Colors.white.withValues(alpha: 0.75),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Feature showcase (PageView cards)
  // ---------------------------------------------------------------------------

  Widget _buildFeatureShowcase() {
    return Column(
      children: [
        SizedBox(
          height: 180,
          child: PageView.builder(
            controller: _pageController,
            itemCount: _heroFeatures.length,
            onPageChanged: (i) => setState(() => _currentPage = i),
            itemBuilder: (context, index) {
              final feature = _heroFeatures[index];
              return Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: FeelsSpacing.s2),
                child: Container(
                  decoration: BoxDecoration(
                    color: FeelsColors.bgSecondary,
                    borderRadius: FeelsRadius.lgAll,
                    border: Border.all(color: FeelsColors.border),
                  ),
                  padding: const EdgeInsets.all(FeelsSpacing.s5),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        feature.icon,
                        size: 48,
                        color: FeelsColors.primary,
                      ),
                      const SizedBox(height: FeelsSpacing.s4),
                      Text(
                        feature.name,
                        style: FeelsTypography.title,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: FeelsSpacing.s2),
                      Text(
                        feature.description,
                        style: FeelsTypography.body.copyWith(
                          color: FeelsColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: FeelsSpacing.s4),

        // Dot indicators
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            _heroFeatures.length,
            (i) => Container(
              width: i == _currentPage ? 24 : 8,
              height: 8,
              margin: const EdgeInsets.symmetric(horizontal: 3),
              decoration: BoxDecoration(
                color: i == _currentPage
                    ? FeelsColors.primary
                    : FeelsColors.bgTertiary,
                borderRadius: FeelsRadius.fullAll,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Social proof bar
  // ---------------------------------------------------------------------------

  Widget _buildSocialProof() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(
          Icons.star_rounded,
          size: 16,
          color: FeelsColors.secondary,
        ),
        const SizedBox(width: FeelsSpacing.s1),
        Text(
          '4.8 rated by 2,000+ members',
          style: FeelsTypography.caption.copyWith(
            color: FeelsColors.textSecondary,
            fontWeight: FeelsTypography.weightNormal,
          ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Pricing section (radio-style cards)
  // ---------------------------------------------------------------------------

  Widget _buildPricingSection() {
    return Column(
      children: _plans.map((plan) {
        final isSelected = plan.type == _selectedPlan;
        final isPopular = plan.badge != null;

        return Padding(
          padding: const EdgeInsets.only(bottom: FeelsSpacing.s3),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              GestureDetector(
                onTap: () => setState(() => _selectedPlan = plan.type),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOut,
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    horizontal: FeelsSpacing.s5,
                    vertical: FeelsSpacing.s5,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? FeelsColors.primaryMuted
                        : FeelsColors.bgSecondary,
                    borderRadius: FeelsRadius.lgAll,
                    border: Border.all(
                      color: isPopular
                          ? FeelsColors.primary
                          : isSelected
                              ? FeelsColors.primary
                              : FeelsColors.border,
                      width: isPopular ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Radio indicator
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected
                                ? FeelsColors.primary
                                : FeelsColors.textTertiary,
                            width: 2,
                          ),
                          color: isSelected
                              ? FeelsColors.primary
                              : Colors.transparent,
                        ),
                        child: isSelected
                            ? const Icon(
                                Icons.check,
                                size: 14,
                                color: Colors.white,
                              )
                            : null,
                      ),
                      const SizedBox(width: FeelsSpacing.s4),

                      // Plan info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(plan.name, style: FeelsTypography.title),
                                if (plan.savings != null) ...[
                                  const SizedBox(width: FeelsSpacing.s2),
                                  Text(
                                    plan.savings!,
                                    style: FeelsTypography.caption.copyWith(
                                      color: FeelsColors.primary,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: FeelsSpacing.s1),
                            Text(
                              plan.totalPrice,
                              style: FeelsTypography.bodySmall,
                            ),
                          ],
                        ),
                      ),

                      // Per-month price (large)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            plan.perMonth,
                            style: FeelsTypography.h2.copyWith(
                              color: isSelected
                                  ? FeelsColors.primary
                                  : FeelsColors.textPrimary,
                            ),
                          ),
                          Text(
                            '/mo',
                            style: FeelsTypography.caption.copyWith(
                              color: FeelsColors.textTertiary,
                              fontWeight: FeelsTypography.weightNormal,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // "BEST VALUE" badge
              if (isPopular)
                Positioned(
                  top: -10,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: FeelsSpacing.s3,
                        vertical: FeelsSpacing.s1,
                      ),
                      decoration: BoxDecoration(
                        color: FeelsColors.primary,
                        borderRadius: FeelsRadius.fullAll,
                      ),
                      child: Text(
                        plan.badge!,
                        style: const TextStyle(
                          fontSize: FeelsTypography.sizeXs,
                          fontWeight: FeelsTypography.weightHeading,
                          letterSpacing: FeelsTypography.letterSpacingWide,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      }).toList(),
    );
  }

  // ---------------------------------------------------------------------------
  // CTA section (sticky bottom)
  // ---------------------------------------------------------------------------

  Widget _buildCTASection(double bottomPadding) {
    final plan = _selected;

    return Container(
      padding: EdgeInsets.fromLTRB(
        FeelsLayout.screenPaddingHorizontal,
        FeelsSpacing.s4,
        FeelsLayout.screenPaddingHorizontal,
        bottomPadding + FeelsSpacing.s4,
      ),
      decoration: const BoxDecoration(
        color: FeelsColors.bgPrimary,
        border: Border(
          top: BorderSide(color: FeelsColors.border),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: _ctaAnimation,
            builder: (context, _) {
              return Transform.scale(
                scale: _ctaAnimation.value,
                child: SizedBox(
                  width: double.infinity,
                  height: FeelsLayout.buttonHeight,
                  child: ElevatedButton(
                    onPressed: _purchasing
                        ? null
                        : () => _handlePurchase(plan.productId),
                    child: _purchasing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Start 7-day free trial'),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: FeelsSpacing.s2),
          Text(
            'Then ${plan.perMonth}/month. Cancel anytime.',
            style: FeelsTypography.caption.copyWith(
              color: FeelsColors.textTertiary,
              fontWeight: FeelsTypography.weightNormal,
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Purchase & cancel handlers
  // ---------------------------------------------------------------------------

  Future<void> _handlePurchase(String productId) async {
    if (_purchasing) return;

    setState(() {
      _purchasing = true;
      _error = null;
    });

    try {
      final offerings = await Purchases.getOfferings();
      final offering = offerings.current;
      if (offering == null) {
        setState(() {
          _error = 'No offerings available. Please try again later.';
          _purchasing = false;
        });
        return;
      }

      final package = offering.availablePackages.firstWhere(
        (p) => p.storeProduct.identifier == productId,
        orElse: () => throw Exception('Product not found: $productId'),
      );

      await Purchases.purchasePackage(package);

      // Refresh subscription and credits state after successful purchase.
      await Future.wait([
        ref.read(subscriptionProvider.notifier).refresh(),
        ref.read(creditsProvider.notifier).refresh(),
      ]);

      if (mounted) {
        Navigator.of(context).pop();
      }
    } on PurchasesErrorCode catch (e) {
      if (e == PurchasesErrorCode.purchaseCancelledError) {
        setState(() => _purchasing = false);
        return;
      }
      setState(() {
        _error = 'Purchase failed. Please try again.';
        _purchasing = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Something went wrong. Please try again.';
        _purchasing = false;
      });
    }
  }

  Future<void> _handleCancel() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Subscription'),
        content: const Text(
          "Are you sure you want to cancel? You'll keep premium "
          'access until the end of your billing period.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: FeelsColors.error),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _purchasing = true);
    try {
      await ref.read(subscriptionProvider.notifier).cancel();
      await ref.read(creditsProvider.notifier).refresh();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Failed to cancel. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _purchasing = false);
    }
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}
