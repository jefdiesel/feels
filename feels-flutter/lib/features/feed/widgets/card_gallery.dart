import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/theme.dart';

/// Photo gallery inside the swipe card.
///
/// Uses TAP ZONES instead of PageView to avoid gesture conflicts with
/// the parent swipe GestureDetector:
///   - Left 1/3 tap = previous photo
///   - Right 2/3 tap = next photo
///
/// Transitions use [AnimatedSwitcher] with a crossfade for smoothness.
/// Photos are preloaded via [CachedNetworkImage].
class CardGallery extends StatefulWidget {
  final List<String> photoUrls;
  final BorderRadius? borderRadius;

  const CardGallery({
    super.key,
    required this.photoUrls,
    this.borderRadius,
  });

  @override
  State<CardGallery> createState() => _CardGalleryState();
}

class _CardGalleryState extends State<CardGallery> {
  int _currentIndex = 0;

  @override
  void didUpdateWidget(CardGallery oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Reset index if the photo list changes (new card).
    if (oldWidget.photoUrls != widget.photoUrls) {
      _currentIndex = 0;
    }
  }

  void _goToPrevious() {
    if (_currentIndex > 0) {
      setState(() => _currentIndex--);
    }
  }

  void _goToNext() {
    if (_currentIndex < widget.photoUrls.length - 1) {
      setState(() => _currentIndex++);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.photoUrls.isEmpty) {
      return _buildPlaceholder();
    }

    return ClipRRect(
      borderRadius: widget.borderRadius ?? BorderRadius.zero,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Photo with crossfade.
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 250),
            transitionBuilder: (child, animation) {
              return FadeTransition(opacity: animation, child: child);
            },
            child: CachedNetworkImage(
              key: ValueKey(widget.photoUrls[_currentIndex]),
              imageUrl: widget.photoUrls[_currentIndex],
              fit: BoxFit.cover,
              width: double.infinity,
              height: double.infinity,
              placeholder: (_, __) => Container(
                color: FeelsColors.bgTertiary,
                child: const Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: FeelsColors.textTertiary,
                    ),
                  ),
                ),
              ),
              errorWidget: (_, __, ___) => Container(
                color: FeelsColors.bgTertiary,
                child: const Center(
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: FeelsColors.textTertiary,
                    size: 32,
                  ),
                ),
              ),
            ),
          ),

          // Gradient overlay fading to black at bottom.
          Positioned.fill(
            child: DecoratedBox(
              decoration: const BoxDecoration(
                gradient: FeelsGradients.photoOverlay,
              ),
            ),
          ),

          // Tap zones — invisible, layered on top.
          if (widget.photoUrls.length > 1)
            Row(
              children: [
                // Left 1/3 — previous.
                Expanded(
                  flex: 1,
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTap: _goToPrevious,
                    child: const SizedBox.expand(),
                  ),
                ),
                // Right 2/3 — next.
                Expanded(
                  flex: 2,
                  child: GestureDetector(
                    behavior: HitTestBehavior.translucent,
                    onTap: _goToNext,
                    child: const SizedBox.expand(),
                  ),
                ),
              ],
            ),

          // Dot indicators at top.
          if (widget.photoUrls.length > 1)
            Positioned(
              top: 8,
              left: 0,
              right: 0,
              child: _DotIndicators(
                count: widget.photoUrls.length,
                current: _currentIndex,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return ClipRRect(
      borderRadius: widget.borderRadius ?? BorderRadius.zero,
      child: Container(
        color: FeelsColors.bgTertiary,
        child: const Center(
          child: Icon(
            Icons.person_outline,
            color: FeelsColors.textTertiary,
            size: 48,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Preload helper — call from parent to warm the cache for upcoming cards.
// ---------------------------------------------------------------------------

void preloadPhotos(BuildContext context, List<String> urls) {
  for (final url in urls) {
    // Trigger CachedNetworkImage's cache manager.
    CachedNetworkImageProvider(url)
        .resolve(createLocalImageConfiguration(context));
  }
}

// ---------------------------------------------------------------------------
// Dot indicators
// ---------------------------------------------------------------------------

class _DotIndicators extends StatelessWidget {
  final int count;
  final int current;

  const _DotIndicators({required this.count, required this.current});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final isActive = i == current;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.symmetric(horizontal: 3),
          width: isActive ? 8 : 6,
          height: isActive ? 8 : 6,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive
                ? Colors.white
                : Colors.white.withValues(alpha: 0.4),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 2,
              ),
            ],
          ),
        );
      }),
    );
  }
}
