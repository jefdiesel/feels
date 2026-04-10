import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/theme.dart';
import '../domain/models/feed_profile.dart';
import 'card_gallery.dart';
import 'profile_info.dart';

// ---------------------------------------------------------------------------
// Swipe direction
// ---------------------------------------------------------------------------

enum _SwipeDir { none, left, right }

// ---------------------------------------------------------------------------
// SwipeCard — the KEY widget
//
// Custom gesture-driven swipe card with spring physics.
// Renders a stack of max 3 cards; only the top card is interactive.
// ---------------------------------------------------------------------------

class SwipeCardStack extends StatefulWidget {
  final List<FeedProfile> profiles;
  final void Function(FeedProfile profile)? onLike;
  final void Function(FeedProfile profile)? onPass;
  final void Function(FeedProfile profile)? onSuperlike;

  /// Maximum number of cards rendered simultaneously.
  static const int maxVisible = 3;

  const SwipeCardStack({
    super.key,
    required this.profiles,
    this.onLike,
    this.onPass,
    this.onSuperlike,
  });

  @override
  State<SwipeCardStack> createState() => SwipeCardStackState();
}

class SwipeCardStackState extends State<SwipeCardStack>
    with TickerProviderStateMixin {
  late AnimationController _dragController;
  Offset _dragOffset = Offset.zero;
  bool _isDragging = false;

  // Track the card being animated out so we don't prematurely remove it.
  bool _isAnimatingOut = false;

  @override
  void initState() {
    super.initState();
    _dragController = AnimationController.unbounded(vsync: this);
    _dragController.addListener(_onDragTick);
  }

  @override
  void dispose() {
    _dragController.removeListener(_onDragTick);
    _dragController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Public API — allow parent (buttons) to trigger programmatic swipes.
  // ---------------------------------------------------------------------------

  void triggerLike() => _animateOut(_SwipeDir.right);
  void triggerPass() => _animateOut(_SwipeDir.left);

  // ---------------------------------------------------------------------------
  // Gesture handlers
  // ---------------------------------------------------------------------------

  void _onPanStart(DragStartDetails _) {
    _isDragging = true;
    _dragController.stop();
  }

  void _onPanUpdate(DragUpdateDetails details) {
    if (!_isDragging) return;
    setState(() {
      _dragOffset += details.delta;
    });
  }

  void _onPanEnd(DragEndDetails details) {
    _isDragging = false;
    final screenWidth = MediaQuery.of(context).size.width;
    final threshold = screenWidth * 0.4;
    final velocity = details.velocity.pixelsPerSecond.dx;

    // A fast flick (>800px/s) commits the swipe even if threshold isn't met.
    final fastFlick = velocity.abs() > 800;

    if (_dragOffset.dx > threshold || (fastFlick && velocity > 0)) {
      _animateOut(_SwipeDir.right);
    } else if (_dragOffset.dx < -threshold || (fastFlick && velocity < 0)) {
      _animateOut(_SwipeDir.left);
    } else {
      _animateBack();
    }
  }

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------

  void _animateOut(_SwipeDir dir) {
    if (_isAnimatingOut) return;
    _isAnimatingOut = true;

    // Haptic feedback when swipe commits.
    HapticFeedback.lightImpact();

    final screenWidth = MediaQuery.of(context).size.width;
    final target = dir == _SwipeDir.right ? screenWidth * 1.5 : -screenWidth * 1.5;

    // Use a spring for the throw — fast, natural deceleration.
    final simulation = SpringSimulation(
      const SpringDescription(mass: 1, stiffness: 600, damping: 30),
      _dragOffset.dx,
      target,
      0, // end velocity
    );

    final startDy = _dragOffset.dy;
    final startDx = _dragOffset.dx;
    final dxRange = target - startDx;

    _dragController.animateWith(simulation);

    void listener(AnimationStatus status) {
      if (status == AnimationStatus.completed ||
          status == AnimationStatus.dismissed) {
        _dragController.removeStatusListener(listener);

        // Fire callback.
        if (widget.profiles.isNotEmpty) {
          final profile = widget.profiles.first;
          if (dir == _SwipeDir.right) {
            widget.onLike?.call(profile);
          } else {
            widget.onPass?.call(profile);
          }
        }

        // Reset.
        setState(() {
          _dragOffset = Offset.zero;
          _isAnimatingOut = false;
        });
      }
    }

    _dragController.addStatusListener(listener);

    // Drive both dx and dy together.
    _dragController.addListener(() {
      final progress =
          dxRange.abs() > 0 ? (_dragController.value - startDx) / dxRange : 0.0;
      setState(() {
        _dragOffset = Offset(
          _dragController.value,
          startDy * (1 - progress.clamp(0.0, 1.0)),
        );
      });
    });
  }

  void _animateBack() {
    final simulation = SpringSimulation(
      const SpringDescription(mass: 1, stiffness: 400, damping: 28),
      _dragOffset.dx,
      0, // target = center
      0,
    );

    _dragController.animateWith(simulation);

    void listener(AnimationStatus status) {
      if (status == AnimationStatus.completed ||
          status == AnimationStatus.dismissed) {
        _dragController.removeStatusListener(listener);
        setState(() {
          _dragOffset = Offset.zero;
        });
      }
    }

    _dragController.addStatusListener(listener);
  }

  void _onDragTick() {
    // Updates driven via setState in the animation listeners above.
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final cardCount =
        math.min(widget.profiles.length, SwipeCardStack.maxVisible);
    if (cardCount == 0) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        return Stack(
          clipBehavior: Clip.none,
          children: List.generate(cardCount, (i) {
            // Cards are built bottom-to-top: last in list = top of stack.
            final reverseIndex = cardCount - 1 - i;
            final profile = widget.profiles[reverseIndex];
            final isTop = reverseIndex == 0;

            // Scale + vertical offset for background cards.
            final scale = 1.0 - (reverseIndex == 0 ? 0 : reverseIndex * 0.04);
            final yOffset = reverseIndex == 0 ? 0.0 : reverseIndex * -8.0;

            Widget card = _SingleCard(
              key: ValueKey(profile.userId),
              profile: profile,
              constraints: constraints,
            );

            if (isTop) {
              // Drag transform.
              final dx = _dragOffset.dx;
              final rotationAngle = dx / (constraints.maxWidth) * 0.4;
              final overlayOpacity = (dx.abs() / (constraints.maxWidth * 0.4))
                  .clamp(0.0, 1.0);
              final swipeDir = dx > 0
                  ? _SwipeDir.right
                  : (dx < 0 ? _SwipeDir.left : _SwipeDir.none);

              card = GestureDetector(
                onPanStart: _onPanStart,
                onPanUpdate: _onPanUpdate,
                onPanEnd: _onPanEnd,
                child: Transform.translate(
                  offset: _dragOffset,
                  child: Transform.rotate(
                    angle: rotationAngle,
                    child: Stack(
                      children: [
                        card,
                        // Like / Pass overlay.
                        if (swipeDir != _SwipeDir.none)
                          _SwipeOverlay(
                            direction: swipeDir,
                            opacity: overlayOpacity,
                            constraints: constraints,
                          ),
                      ],
                    ),
                  ),
                ),
              );
            } else {
              card = Transform.scale(
                scale: scale,
                child: Transform.translate(
                  offset: Offset(0, yOffset),
                  child: card,
                ),
              );
            }

            return card;
          }),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Single card (photo gallery + info)
// ---------------------------------------------------------------------------

class _SingleCard extends StatelessWidget {
  final FeedProfile profile;
  final BoxConstraints constraints;

  const _SingleCard({
    super.key,
    required this.profile,
    required this.constraints,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: constraints.maxWidth,
      height: constraints.maxHeight,
      decoration: BoxDecoration(
        color: FeelsColors.bgSecondary,
        borderRadius: FeelsRadius.lgAll,
      ),
      clipBehavior: Clip.hardEdge,
      child: Column(
        children: [
          // Photo gallery — 62% of card height.
          SizedBox(
            height: constraints.maxHeight * FeelsLayout.photoHeightPercent,
            child: CardGallery(
              photoUrls: profile.sortedPhotoUrls,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(FeelsRadius.lg),
                topRight: Radius.circular(FeelsRadius.lg),
              ),
            ),
          ),
          // Scrollable profile info fills the rest.
          Expanded(
            child: ProfileInfo(profile: profile),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Like / Pass overlay
// ---------------------------------------------------------------------------

class _SwipeOverlay extends StatelessWidget {
  final _SwipeDir direction;
  final double opacity;
  final BoxConstraints constraints;

  const _SwipeOverlay({
    required this.direction,
    required this.opacity,
    required this.constraints,
  });

  @override
  Widget build(BuildContext context) {
    final isLike = direction == _SwipeDir.right;
    final color = isLike ? FeelsColors.like : FeelsColors.pass;

    return Positioned.fill(
      child: Container(
        decoration: BoxDecoration(
          borderRadius: FeelsRadius.lgAll,
          border: Border.all(
            color: color.withValues(alpha: opacity * 0.8),
            width: 4,
          ),
        ),
        child: Align(
          alignment: isLike ? Alignment.topLeft : Alignment.topRight,
          child: Padding(
            padding: const EdgeInsets.all(FeelsSpacing.s5),
            child: Transform.rotate(
              angle: isLike ? -0.2 : 0.2,
              child: isLike
                  ? _LikeLabel(color: color, opacity: opacity)
                  : _PassLabel(color: color, opacity: opacity),
            ),
          ),
        ),
      ),
    );
  }
}

/// LIKE label with heart icon.
class _LikeLabel extends StatelessWidget {
  final Color color;
  final double opacity;

  const _LikeLabel({required this.color, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: FeelsSpacing.s3,
        vertical: FeelsSpacing.s2,
      ),
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 3),
        borderRadius: FeelsRadius.smAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.favorite,
            color: color,
            size: 28,
          ),
          const SizedBox(width: FeelsSpacing.s2),
          Text(
            'LIKE',
            style: TextStyle(
              color: color,
              fontSize: 36,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Pass label — subtle X icon only, no text.
class _PassLabel extends StatelessWidget {
  final Color color;
  final double opacity;

  const _PassLabel({required this.color, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        border: Border.all(color: color, width: 3),
        borderRadius: FeelsRadius.smAll,
      ),
      child: Center(
        child: Icon(
          Icons.close,
          color: color,
          size: 32,
        ),
      ),
    );
  }
}
