import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/theme.dart';
import '../../domain/models/swipe_action.dart';
import '../../widgets/card_gallery.dart';
import '../../widgets/swipe_card.dart';
import '../providers/feed_provider.dart';

/// Main feed screen — swipe card stack + action buttons.
class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  final _swipeKey = GlobalKey<SwipeCardStackState>();

  @override
  Widget build(BuildContext context) {
    final feedAsync = ref.watch(feedProvider);
    final screenPadding = MediaQuery.of(context).padding;

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      body: feedAsync.when(
        loading: () => SafeArea(
          child: Column(
            children: [
              _FeedHeader(),
              const Expanded(child: _SkeletonCard()),
              Padding(
                padding: EdgeInsets.only(
                  bottom: screenPadding.bottom > 0 ? 8 : 16,
                  top: 12,
                ),
                child: const _SkeletonActionButtons(),
              ),
            ],
          ),
        ),
        error: (error, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline,
                size: 48,
                color: FeelsColors.error,
              ),
              const SizedBox(height: FeelsSpacing.s4),
              Text(
                error.toString(),
                style: const TextStyle(
                  fontSize: FeelsTypography.sizeBase,
                  color: FeelsColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: FeelsSpacing.s5),
              OutlinedButton(
                onPressed: () => ref.read(feedProvider.notifier).loadProfiles(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (feedState) {
          // Preload photos for the next couple of cards.
          _preloadUpcoming(feedState);

          // Match animation overlay.
          if (feedState.lastSwipeResult?.matched == true) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _showMatchAnimation(context, feedState);
            });
          }

          // Premium required overlay.
          if (feedState.lastSwipeResult?.requiresPremium == true) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _showPremiumGate(context, feedState);
            });
          }

          return SafeArea(
            child: Column(
              children: [
                // Header.
                _FeedHeader(),

                // Error / warning banners.
                if (feedState.error != null)
                  _WarningBanner(
                    message: feedState.error!,
                    onDismiss: () =>
                        ref.read(feedProvider.notifier).clearError(),
                  ),

                // Card stack.
                Expanded(
                  child: feedState.isEmpty
                      ? _EmptyState(
                          onRefresh: () =>
                              ref.read(feedProvider.notifier).loadProfiles(),
                        )
                      : Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: FeelsLayout.screenPaddingHorizontal,
                          ),
                          child: SwipeCardStack(
                            key: _swipeKey,
                            profiles: feedState.remaining,
                            onLike: (profile) {
                              ref
                                  .read(feedProvider.notifier)
                                  .swipe(SwipeAction.like);
                            },
                            onPass: (profile) {
                              ref
                                  .read(feedProvider.notifier)
                                  .swipe(SwipeAction.pass);
                            },
                            onSuperlike: (profile) {
                              ref
                                  .read(feedProvider.notifier)
                                  .swipe(SwipeAction.superlike);
                            },
                          ),
                        ),
                ),

                // Action buttons.
                if (!feedState.isEmpty)
                  Padding(
                    padding: EdgeInsets.only(
                      bottom: screenPadding.bottom > 0 ? 8 : 16,
                      top: 12,
                    ),
                    child: _ActionButtons(
                      onPass: () {
                        HapticFeedback.selectionClick();
                        _swipeKey.currentState?.triggerPass();
                      },
                      onLike: () {
                        HapticFeedback.selectionClick();
                        _swipeKey.currentState?.triggerLike();
                      },
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Photo preloading
  // ---------------------------------------------------------------------------

  void _preloadUpcoming(FeedState feedState) {
    final remaining = feedState.remaining;
    // Preload photos for the next 2 cards (beyond the visible 3).
    for (var i = 1; i < remaining.length && i <= 3; i++) {
      final urls = remaining[i].sortedPhotoUrls;
      if (urls.isNotEmpty) {
        preloadPhotos(context, urls);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Match animation
  // ---------------------------------------------------------------------------

  void _showMatchAnimation(BuildContext context, FeedState feedState) {
    final profile = feedState.lastSwipedProfile;
    if (profile == null) return;

    ref.read(feedProvider.notifier).clearLastSwipe();
    HapticFeedback.mediumImpact();

    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Match',
      barrierColor: Colors.black87,
      transitionDuration: const Duration(milliseconds: 200),
      transitionBuilder: (context, anim, _, child) {
        return FadeTransition(opacity: anim, child: child);
      },
      pageBuilder: (context, animation, __) {
        return _MatchOverlay(
          profile: profile,
          matchId: feedState.lastSwipeResult?.matchId,
          animation: animation,
        );
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Premium gate
  // ---------------------------------------------------------------------------

  void _showPremiumGate(BuildContext context, FeedState feedState) {
    final reason = feedState.lastSwipeResult?.premiumReason ?? 'Premium required';
    ref.read(feedProvider.notifier).clearLastSwipe();

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: FeelsColors.overlay,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(FeelsRadius.xl),
        ),
      ),
      builder: (context) {
        return _PremiumGateSheet(reason: reason);
      },
    );
  }
}

// =============================================================================
// Match overlay with staggered animations + floating hearts
// =============================================================================

class _MatchOverlay extends StatefulWidget {
  final dynamic profile;
  final String? matchId;
  final Animation<double> animation;

  const _MatchOverlay({
    required this.profile,
    this.matchId,
    required this.animation,
  });

  @override
  State<_MatchOverlay> createState() => _MatchOverlayState();
}

class _MatchOverlayState extends State<_MatchOverlay>
    with TickerProviderStateMixin {
  late final AnimationController _staggerController;
  late final Animation<double> _titleScale;
  late final Animation<double> _avatarOpacity;
  late final Animation<double> _buttonsSlide;
  late final AnimationController _heartsController;

  // Random positions for floating hearts.
  final _rng = math.Random();
  late final List<_FloatingHeart> _hearts;

  @override
  void initState() {
    super.initState();

    // Stagger controller: total 1s for the sequence.
    _staggerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    // Title scales in from 0.2s to 0.6s (400ms, elastic).
    _titleScale = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _staggerController,
        curve: const Interval(0.2, 0.6, curve: Curves.elasticOut),
      ),
    );

    // Avatar fades in from 0.6s to 0.8s.
    _avatarOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _staggerController,
        curve: const Interval(0.6, 0.8, curve: Curves.easeOut),
      ),
    );

    // Buttons slide up from 0.8s to 1.0s.
    _buttonsSlide = Tween<double>(begin: 40.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _staggerController,
        curve: const Interval(0.8, 1.0, curve: Curves.easeOut),
      ),
    );

    // Floating hearts controller: 2s loop.
    _heartsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    // Generate 10 random floating hearts.
    _hearts = List.generate(10, (_) {
      return _FloatingHeart(
        startX: _rng.nextDouble() * 300 - 150,
        startY: _rng.nextDouble() * 40 + 20,
        endY: -(_rng.nextDouble() * 200 + 100),
        delay: _rng.nextDouble() * 0.4,
        size: _rng.nextDouble() * 12 + 8,
      );
    });

    // Start the stagger after the overlay fades in.
    widget.animation.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _staggerController.forward();
        _heartsController.forward();
      }
    });

    // If animation already completed (hot reload, etc.).
    if (widget.animation.isCompleted) {
      _staggerController.forward();
      _heartsController.forward();
    }
  }

  @override
  void dispose() {
    _staggerController.dispose();
    _heartsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_staggerController, _heartsController]),
      builder: (context, _) {
        return Material(
          type: MaterialType.transparency,
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Floating hearts.
                ..._hearts.map((heart) {
                  final t = (_heartsController.value - heart.delay)
                      .clamp(0.0, 1.0);
                  final curvedT = Curves.easeOut.transform(t);
                  final opacity = t < 0.1
                      ? (t / 0.1)
                      : (1.0 - ((t - 0.1) / 0.9)).clamp(0.0, 1.0);

                  return Positioned(
                    left: MediaQuery.of(context).size.width / 2 +
                        heart.startX -
                        heart.size / 2,
                    top: MediaQuery.of(context).size.height / 2 +
                        heart.startY +
                        (heart.endY - heart.startY) * curvedT,
                    child: Opacity(
                      opacity: opacity.clamp(0.0, 1.0),
                      child: Icon(
                        Icons.favorite,
                        size: heart.size,
                        color: FeelsColors.primary,
                      ),
                    ),
                  );
                }),

                // Main content column.
                Padding(
                  padding: const EdgeInsets.all(FeelsSpacing.s6),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Title.
                      ScaleTransition(
                        scale: _titleScale,
                        child: const Text(
                          'It\'s a match!',
                          style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w700,
                            color: FeelsColors.primary,
                            letterSpacing: FeelsTypography.letterSpacingTight,
                            decoration: TextDecoration.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: FeelsSpacing.s2),
                      ScaleTransition(
                        scale: _titleScale,
                        child: Text(
                          'You and ${widget.profile.name} liked each other',
                          style: const TextStyle(
                            fontSize: FeelsTypography.sizeBase,
                            color: FeelsColors.textSecondary,
                            fontWeight: FeelsTypography.weightNormal,
                            decoration: TextDecoration.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: FeelsSpacing.s6),

                      // Avatar.
                      Opacity(
                        opacity: _avatarOpacity.value,
                        child: _MatchAvatar(
                            url: widget.profile.primaryPhotoUrl),
                      ),
                      const SizedBox(height: FeelsSpacing.s6),

                      // Buttons.
                      Transform.translate(
                        offset: Offset(0, _buttonsSlide.value),
                        child: Opacity(
                          opacity: (1.0 - _buttonsSlide.value / 40)
                              .clamp(0.0, 1.0),
                          child: Column(
                            children: [
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                  if (widget.matchId != null) {
                                    context.push(
                                        '/home/chat/${widget.matchId}');
                                  }
                                },
                                child: const Text('Send a message'),
                              ),
                              const SizedBox(height: FeelsSpacing.s3),
                              TextButton(
                                onPressed: () =>
                                    Navigator.of(context).pop(),
                                child: const Text('Keep swiping'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _FloatingHeart {
  final double startX;
  final double startY;
  final double endY;
  final double delay;
  final double size;

  const _FloatingHeart({
    required this.startX,
    required this.startY,
    required this.endY,
    required this.delay,
    required this.size,
  });
}

// =============================================================================
// Premium gate bottom sheet
// =============================================================================

class _PremiumGateSheet extends StatelessWidget {
  final String reason;

  const _PremiumGateSheet({required this.reason});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: FeelsColors.bgSecondary,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(FeelsRadius.xl),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Gradient header with premium icon.
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(
              top: FeelsSpacing.s4,
              bottom: FeelsSpacing.s5,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  FeelsColors.secondary.withValues(alpha: 0.15),
                  FeelsColors.bgSecondary,
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(FeelsRadius.xl),
              ),
            ),
            child: Column(
              children: [
                // Drag handle.
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: FeelsColors.textTertiary,
                    borderRadius: FeelsRadius.fullAll,
                  ),
                ),
                const SizedBox(height: FeelsSpacing.s5),
                // Premium icon in a subtle circle.
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: FeelsColors.secondaryMuted,
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.workspace_premium,
                      size: 32,
                      color: FeelsColors.secondary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: FeelsSpacing.s5,
            ),
            child: Column(
              children: [
                // Title.
                const Text(
                  'Upgrade to feels+',
                  style: TextStyle(
                    fontSize: FeelsTypography.sizeH2,
                    fontWeight: FeelsTypography.weightHeading,
                    color: FeelsColors.textPrimary,
                    height: FeelsTypography.lineHeightHeading,
                  ),
                ),
                const SizedBox(height: FeelsSpacing.s2),

                // Contextual reason.
                Text(
                  reason.isNotEmpty
                      ? reason
                      : 'You\'ve used all your daily likes',
                  style: const TextStyle(
                    fontSize: FeelsTypography.sizeBase,
                    color: FeelsColors.textSecondary,
                    height: FeelsTypography.lineHeightBody,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: FeelsSpacing.s5),

                // Feature highlights.
                const _PremiumFeatureRow(
                  icon: Icons.favorite,
                  iconColor: FeelsColors.like,
                  title: 'Unlimited likes',
                  subtitle: 'Like as many people as you want',
                ),
                const SizedBox(height: FeelsSpacing.s4),
                const _PremiumFeatureRow(
                  icon: Icons.visibility,
                  iconColor: FeelsColors.tertiary,
                  title: 'See who likes you',
                  subtitle: 'Skip the guessing, match instantly',
                ),
                const SizedBox(height: FeelsSpacing.s4),
                const _PremiumFeatureRow(
                  icon: Icons.replay,
                  iconColor: FeelsColors.secondary,
                  title: 'Rewind',
                  subtitle: 'Undo your last swipe',
                ),
                const SizedBox(height: FeelsSpacing.s6),

                // Primary CTA.
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                      context.push('/premium');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: FeelsColors.secondary,
                    ),
                    child: const Text('Try feels+ free for 7 days'),
                  ),
                ),
                const SizedBox(height: FeelsSpacing.s3),

                // Secondary CTA.
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'Maybe later',
                    style: TextStyle(
                      fontSize: FeelsTypography.sizeBase,
                      fontWeight: FeelsTypography.weightNormal,
                      color: FeelsColors.textTertiary,
                    ),
                  ),
                ),

                SizedBox(
                  height: MediaQuery.of(context).padding.bottom +
                      FeelsSpacing.s4,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PremiumFeatureRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;

  const _PremiumFeatureRow({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: iconColor.withValues(alpha: 0.15),
          ),
          child: Center(
            child: Icon(icon, color: iconColor, size: 20),
          ),
        ),
        const SizedBox(width: FeelsSpacing.s3),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: FeelsTypography.sizeBase,
                  fontWeight: FeelsTypography.weightHeading,
                  color: FeelsColors.textPrimary,
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: FeelsTypography.sizeSm,
                  color: FeelsColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Feed header
// ---------------------------------------------------------------------------

class _FeedHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: FeelsLayout.screenPaddingHorizontal,
        vertical: FeelsSpacing.s2,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'feels',
            style: TextStyle(
              fontSize: FeelsTypography.sizeTitle,
              fontWeight: FeelsTypography.weightHeading,
              color: FeelsColors.primary,
              letterSpacing: FeelsTypography.letterSpacingTight,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Action buttons — Pass (X) and Like (heart)
// ---------------------------------------------------------------------------

class _ActionButtons extends StatelessWidget {
  final VoidCallback? onPass;
  final VoidCallback? onLike;

  const _ActionButtons({this.onPass, this.onLike});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Pass button.
        _CircleActionButton(
          onTap: onPass,
          color: FeelsColors.pass,
          icon: Icons.close,
        ),
        const SizedBox(width: FeelsSpacing.s6),
        // Like button.
        _CircleActionButton(
          onTap: onLike,
          color: FeelsColors.like,
          icon: Icons.favorite,
        ),
      ],
    );
  }
}

class _CircleActionButton extends StatelessWidget {
  final VoidCallback? onTap;
  final Color color;
  final IconData icon;

  const _CircleActionButton({
    this.onTap,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: FeelsLayout.actionButtonSize,
        height: FeelsLayout.actionButtonSize,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: color,
            width: FeelsLayout.actionButtonBorderWidth,
          ),
        ),
        child: Center(
          child: Icon(
            icon,
            color: color,
            size: FeelsLayout.actionButtonIconSize,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Match avatar
// ---------------------------------------------------------------------------

class _MatchAvatar extends StatelessWidget {
  final String? url;

  const _MatchAvatar({this.url});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: FeelsColors.primary, width: 3),
      ),
      child: ClipOval(
        child: url != null
            ? Image.network(url!, fit: BoxFit.cover)
            : Container(
                color: FeelsColors.bgTertiary,
                child: const Icon(
                  Icons.person,
                  size: 40,
                  color: FeelsColors.textTertiary,
                ),
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Skeleton loader card
// ---------------------------------------------------------------------------

class _SkeletonCard extends StatefulWidget {
  const _SkeletonCard();

  @override
  State<_SkeletonCard> createState() => _SkeletonCardState();
}

class _SkeletonCardState extends State<_SkeletonCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shimmerController;
  late final Animation<double> _shimmer;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _shimmer = CurvedAnimation(
      parent: _shimmerController,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: FeelsLayout.screenPaddingHorizontal,
      ),
      child: AnimatedBuilder(
        animation: _shimmer,
        builder: (context, _) {
          final baseColor = FeelsColors.bgTertiary;
          final highlightColor = FeelsColors.bgSecondary;
          final color =
              Color.lerp(baseColor, highlightColor, _shimmer.value)!;

          return Container(
            decoration: BoxDecoration(
              color: FeelsColors.bgSecondary,
              borderRadius: FeelsRadius.lgAll,
            ),
            clipBehavior: Clip.hardEdge,
            child: Column(
              children: [
                // Photo area — 62% height.
                Expanded(
                  flex: 62,
                  child: Container(
                    width: double.infinity,
                    color: color,
                  ),
                ),
                // Info area — 38%.
                Expanded(
                  flex: 38,
                  child: Padding(
                    padding: const EdgeInsets.all(FeelsSpacing.s4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Name line.
                        Container(
                          width: 180,
                          height: 28,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: FeelsRadius.smAll,
                          ),
                        ),
                        const SizedBox(height: FeelsSpacing.s3),
                        // Subtitle line.
                        Container(
                          width: 120,
                          height: 16,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: FeelsRadius.smAll,
                          ),
                        ),
                        const SizedBox(height: FeelsSpacing.s3),
                        // Bio line.
                        Container(
                          width: double.infinity,
                          height: 14,
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: FeelsRadius.smAll,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SkeletonActionButtons extends StatefulWidget {
  const _SkeletonActionButtons();

  @override
  State<_SkeletonActionButtons> createState() => _SkeletonActionButtonsState();
}

class _SkeletonActionButtonsState extends State<_SkeletonActionButtons>
    with SingleTickerProviderStateMixin {
  late final AnimationController _shimmerController;
  late final Animation<double> _shimmer;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
    _shimmer = CurvedAnimation(
      parent: _shimmerController,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _shimmer,
      builder: (context, _) {
        final color = Color.lerp(
          FeelsColors.bgTertiary,
          FeelsColors.bgSecondary,
          _shimmer.value,
        )!;

        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: FeelsLayout.actionButtonSize,
              height: FeelsLayout.actionButtonSize,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
              ),
            ),
            const SizedBox(width: FeelsSpacing.s6),
            Container(
              width: FeelsLayout.actionButtonSize,
              height: FeelsLayout.actionButtonSize,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
              ),
            ),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyState extends StatelessWidget {
  final VoidCallback? onRefresh;

  const _EmptyState({this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(FeelsSpacing.s6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Stylized heart + magnifying glass illustration.
            SizedBox(
              width: 80,
              height: 80,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(
                    Icons.favorite,
                    size: 64,
                    color: FeelsColors.primaryMuted,
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: FeelsColors.bgPrimary,
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.search,
                          size: 22,
                          color: FeelsColors.textTertiary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: FeelsSpacing.s5),
            const Text(
              'You\'ve seen everyone nearby',
              style: TextStyle(
                fontSize: FeelsTypography.sizeTitle,
                fontWeight: FeelsTypography.weightHeading,
                color: FeelsColors.textPrimary,
                height: FeelsTypography.lineHeightHeading,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s2),
            const Text(
              'We\'ll notify you when new people join',
              style: TextStyle(
                fontSize: FeelsTypography.sizeBase,
                color: FeelsColors.textSecondary,
                height: FeelsTypography.lineHeightBody,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: FeelsSpacing.s5),
            OutlinedButton(
              onPressed: onRefresh,
              child: const Text('Refresh'),
            ),
            const SizedBox(height: FeelsSpacing.s3),
            TextButton(
              onPressed: () => context.push('/preferences'),
              child: const Text('Update preferences'),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Warning banner
// ---------------------------------------------------------------------------

class _WarningBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;

  const _WarningBanner({required this.message, this.onDismiss});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(
        horizontal: FeelsLayout.screenPaddingHorizontal,
        vertical: FeelsSpacing.s1,
      ),
      padding: const EdgeInsets.symmetric(
        horizontal: FeelsSpacing.s3,
        vertical: FeelsSpacing.s2,
      ),
      decoration: BoxDecoration(
        color: FeelsColors.warning.withValues(alpha: 0.15),
        borderRadius: FeelsRadius.smAll,
      ),
      child: Row(
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            color: FeelsColors.warning,
            size: 18,
          ),
          const SizedBox(width: FeelsSpacing.s2),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: FeelsTypography.sizeSm,
                color: FeelsColors.warning,
              ),
            ),
          ),
          if (onDismiss != null)
            GestureDetector(
              onTap: onDismiss,
              child: const Icon(
                Icons.close,
                color: FeelsColors.warning,
                size: 16,
              ),
            ),
        ],
      ),
    );
  }
}
