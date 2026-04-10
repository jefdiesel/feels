import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/theme.dart';

/// Bottom navigation bar for the main shell route.
///
/// 3 tabs: Feed (heart), Matches (message), Profile (user).
/// Active tab uses coral icon + muted background.
/// Matches tab shows an unread badge driven by [unreadMatchCountProvider].
class FeelsBottomNav extends ConsumerWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const FeelsBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  static const _inactiveColor = Color(0xFF707070);
  static const _badgeColor = Color(0xFFEF4444);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    // Ensure at least 20px bottom padding, or use the safe area inset.
    final effectiveBottomPadding = math.max(bottomInset, 20.0);
    final totalHeight = FeelsLayout.tabBarHeight + effectiveBottomPadding - 20;

    final unreadCount = ref.watch(unreadMatchCountProvider);

    return Container(
      height: totalHeight,
      decoration: const BoxDecoration(
        color: FeelsColors.bgSecondary,
        border: Border(
          top: BorderSide(color: FeelsColors.border, width: 1),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          bottom: effectiveBottomPadding - 20,
          top: FeelsLayout.tabBarPaddingTop,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _NavItem(
              icon: Icons.favorite_rounded,
              label: 'Feed',
              isActive: currentIndex == 0,
              onTap: () => onTap(0),
            ),
            _NavItem(
              icon: Icons.chat_bubble_rounded,
              label: 'Matches',
              isActive: currentIndex == 1,
              onTap: () => onTap(1),
              badgeCount: unreadCount,
            ),
            _NavItem(
              icon: Icons.person_rounded,
              label: 'Profile',
              isActive: currentIndex == 2,
              onTap: () => onTap(2),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Individual nav item
// ---------------------------------------------------------------------------

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;
  final int badgeCount;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isActive,
    required this.onTap,
    this.badgeCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final color = isActive ? FeelsColors.primary : FeelsBottomNav._inactiveColor;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: SizedBox(
        width: 72,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon with optional badge
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 40,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isActive ? FeelsColors.primaryMuted : Colors.transparent,
                    borderRadius: FeelsRadius.smAll,
                  ),
                  child: Icon(
                    icon,
                    size: FeelsLayout.tabBarIconSize,
                    color: color,
                  ),
                ),
                // Unread badge
                if (badgeCount > 0)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 1,
                      ),
                      constraints: const BoxConstraints(minWidth: 18),
                      decoration: BoxDecoration(
                        color: FeelsBottomNav._badgeColor,
                        borderRadius: FeelsRadius.fullAll,
                      ),
                      child: Text(
                        badgeCount > 99 ? '99+' : '$badgeCount',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: FeelsTypography.sizeXs,
                fontWeight: isActive
                    ? FeelsTypography.weightHeading
                    : FeelsTypography.weightNormal,
                letterSpacing: FeelsTypography.letterSpacingWide,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Unread match count provider
// ---------------------------------------------------------------------------

/// Provider for unread match count. Should be updated by the matches feature
/// or via WebSocket events. Defaults to 0.
final unreadMatchCountProvider = StateProvider<int>((ref) => 0);
