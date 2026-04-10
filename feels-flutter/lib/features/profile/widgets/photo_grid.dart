import 'dart:ui';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/theme.dart';
import '../domain/models/profile_models.dart';
import '../presentation/providers/profile_provider.dart';

/// Maximum number of photo slots (positions 1-6).
const int kMaxPhotos = 6;

/// 3-column photo grid with 3:4 aspect ratio slots.
///
/// Filled slots display the photo with a delete button (top-right) and a "Main"
/// badge on position 1 (bottom-left). Empty slots show a dashed border with a
/// plus icon. In reorder mode, tapping selects a photo (coral border); tapping
/// another swaps the two.
class PhotoGrid extends ConsumerWidget {
  const PhotoGrid({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileState = ref.watch(profileProvider);
    final photos = profileState.sortedPhotos;
    final isReorder = profileState.isReorderMode;
    final firstSelected = profileState.reorderFirstIndex;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: kMaxPhotos,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: FeelsSpacing.s2,
        mainAxisSpacing: FeelsSpacing.s2,
        childAspectRatio: 3 / 4,
      ),
      itemBuilder: (context, index) {
        final hasPhoto = index < photos.length;

        if (hasPhoto) {
          return _FilledSlot(
            photo: photos[index],
            isMain: index == 0,
            isReorderMode: isReorder,
            isSelected: isReorder && firstSelected == index,
            onDelete: () {
              ref.read(profileProvider.notifier).deletePhoto(photos[index].id);
            },
            onTap: isReorder
                ? () => ref.read(profileProvider.notifier).onReorderTap(index)
                : null,
          );
        }

        return _EmptySlot(
          onTap: isReorder
              ? null
              : () => _pickAndUpload(context, ref),
        );
      },
    );
  }

  Future<void> _pickAndUpload(BuildContext context, WidgetRef ref) async {
    final picker = ImagePicker();
    final image = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1200,
      maxHeight: 1600,
      imageQuality: 85,
    );
    if (image == null) return;
    ref.read(profileProvider.notifier).uploadPhoto(image.path);
  }
}

// ---------------------------------------------------------------------------
// Filled photo slot
// ---------------------------------------------------------------------------

class _FilledSlot extends StatelessWidget {
  final Photo photo;
  final bool isMain;
  final bool isReorderMode;
  final bool isSelected;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;

  const _FilledSlot({
    required this.photo,
    required this.isMain,
    required this.isReorderMode,
    required this.isSelected,
    this.onDelete,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: FeelsRadius.mdAll,
          border: isSelected
              ? Border.all(color: FeelsColors.primary, width: 2.5)
              : null,
        ),
        child: ClipRRect(
          borderRadius: FeelsRadius.mdAll,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Photo
              CachedNetworkImage(
                imageUrl: photo.url,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  color: FeelsColors.bgTertiary,
                  child: const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                errorWidget: (_, __, ___) => Container(
                  color: FeelsColors.bgTertiary,
                  child: const Icon(
                    Icons.broken_image_outlined,
                    color: FeelsColors.textTertiary,
                  ),
                ),
              ),

              // Delete button (top-right) — hidden in reorder mode
              if (!isReorderMode)
                Positioned(
                  top: 4,
                  right: 4,
                  child: _CircleButton(
                    icon: Icons.close,
                    size: 24,
                    onTap: onDelete,
                  ),
                ),

              // "Main" badge (bottom-left) for position 1
              if (isMain)
                Positioned(
                  bottom: 4,
                  left: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: FeelsColors.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Main',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: FeelsTypography.sizeXs,
                        fontWeight: FeelsTypography.weightHeading,
                      ),
                    ),
                  ),
                ),

              // Reorder mode overlay
              if (isReorderMode && !isSelected)
                Container(
                  color: Colors.black.withValues(alpha: 0.25),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty photo slot (dashed border + plus icon)
// ---------------------------------------------------------------------------

class _EmptySlot extends StatelessWidget {
  final VoidCallback? onTap;

  const _EmptySlot({this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: CustomPaint(
        painter: _DashedBorderPainter(
          color: FeelsColors.borderLight,
          borderRadius: FeelsRadius.md,
          dashWidth: 6,
          dashGap: 4,
          strokeWidth: 1.5,
        ),
        child: const Center(
          child: Icon(
            Icons.add,
            color: FeelsColors.textTertiary,
            size: 28,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Small circle button (used for delete X)
// ---------------------------------------------------------------------------

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final double size;
  final VoidCallback? onTap;

  const _CircleButton({
    required this.icon,
    required this.size,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
          color: FeelsColors.overlay,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: size * 0.6, color: Colors.white),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Dashed border painter
// ---------------------------------------------------------------------------

class _DashedBorderPainter extends CustomPainter {
  final Color color;
  final double borderRadius;
  final double dashWidth;
  final double dashGap;
  final double strokeWidth;

  _DashedBorderPainter({
    required this.color,
    required this.borderRadius,
    required this.dashWidth,
    required this.dashGap,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      Radius.circular(borderRadius),
    );

    final path = Path()..addRRect(rrect);
    final metrics = path.computeMetrics();

    for (final metric in metrics) {
      double distance = 0;
      while (distance < metric.length) {
        final end = distance + dashWidth;
        final extractPath = metric.extractPath(
          distance,
          end > metric.length ? metric.length : end,
        );
        canvas.drawPath(extractPath, paint);
        distance = end + dashGap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedBorderPainter old) =>
      color != old.color ||
      borderRadius != old.borderRadius ||
      dashWidth != old.dashWidth ||
      dashGap != old.dashGap ||
      strokeWidth != old.strokeWidth;
}
