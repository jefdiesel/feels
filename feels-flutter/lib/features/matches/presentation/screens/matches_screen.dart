import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import '../../domain/models/match.dart';
import '../providers/matches_provider.dart';

class MatchesScreen extends ConsumerWidget {
  final void Function(String matchId, String name)? onOpenConversation;

  const MatchesScreen({super.key, this.onOpenConversation});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(matchesProvider);

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: FeelsColors.bgPrimary,
        title: const Text('Matches', style: FeelsTypography.title),
        centerTitle: false,
        elevation: 0,
      ),
      body: _buildBody(context, ref, state),
    );
  }

  Widget _buildBody(BuildContext context, WidgetRef ref, MatchesState state) {
    if (state.isLoading && state.matches.isEmpty) {
      return const _MatchesSkeletonLoader();
    }

    if (state.error != null && state.matches.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              color: FeelsColors.textTertiary,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              'Could not load matches',
              style: FeelsTypography.body.copyWith(
                color: FeelsColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => ref.read(matchesProvider.notifier).refresh(),
              child: const Text('Try again'),
            ),
          ],
        ),
      );
    }

    if (state.matches.isEmpty) {
      return _buildEmptyState();
    }

    return RefreshIndicator(
      color: FeelsColors.primary,
      backgroundColor: FeelsColors.bgSecondary,
      onRefresh: () => ref.read(matchesProvider.notifier).refresh(),
      child: ListView.builder(
        itemCount: state.matches.length,
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemBuilder: (context, index) {
          final match = state.matches[index];
          return _MatchCard(
            match: match,
            onTap: () {
              HapticFeedback.selectionClick();
              onOpenConversation?.call(match.id, match.otherUser.name);
            },
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: FeelsColors.primaryMuted,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.favorite_border,
                color: FeelsColors.primary,
                size: 36,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No matches yet',
              style: FeelsTypography.title.copyWith(
                color: FeelsColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'When you and someone both like each other, they\'ll show up here.',
              textAlign: TextAlign.center,
              style: FeelsTypography.body.copyWith(
                color: FeelsColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

class _MatchesSkeletonLoader extends StatefulWidget {
  const _MatchesSkeletonLoader();

  @override
  State<_MatchesSkeletonLoader> createState() => _MatchesSkeletonLoaderState();
}

class _MatchesSkeletonLoaderState extends State<_MatchesSkeletonLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return ListView.builder(
          physics: const NeverScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: 5,
          itemBuilder: (context, index) {
            return _SkeletonCard(progress: _controller.value);
          },
        );
      },
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  final double progress;

  const _SkeletonCard({required this.progress});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: FeelsColors.bgSecondary,
        border: Border(
          bottom: BorderSide(color: FeelsColors.border, width: 0.5),
        ),
      ),
      child: Row(
        children: [
          // Avatar skeleton
          _ShimmerBox(
            progress: progress,
            width: 60,
            height: 60,
            borderRadius: 30,
          ),
          const SizedBox(width: 12),

          // Text bars
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ShimmerBox(
                  progress: progress,
                  width: 120,
                  height: 14,
                  borderRadius: FeelsRadius.sm,
                ),
                const SizedBox(height: 8),
                _ShimmerBox(
                  progress: progress,
                  width: 180,
                  height: 12,
                  borderRadius: FeelsRadius.sm,
                ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          // Time placeholder
          _ShimmerBox(
            progress: progress,
            width: 28,
            height: 10,
            borderRadius: FeelsRadius.sm,
          ),
        ],
      ),
    );
  }
}

class _ShimmerBox extends StatelessWidget {
  final double progress;
  final double width;
  final double height;
  final double borderRadius;

  const _ShimmerBox({
    required this.progress,
    required this.width,
    required this.height,
    required this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        gradient: LinearGradient(
          colors: const [
            FeelsColors.bgTertiary,
            FeelsColors.bgSecondary,
            FeelsColors.bgTertiary,
          ],
          stops: const [0.0, 0.5, 1.0],
          begin: Alignment(-1.0 + 2.0 * progress, 0),
          end: Alignment(1.0 + 2.0 * progress, 0),
        ),
      ),
    );
  }
}

/// Simple AnimatedBuilder (same pattern as typing_indicator).
class AnimatedBuilder extends AnimatedWidget {
  final Widget Function(BuildContext context, Widget? child) builder;

  const AnimatedBuilder({
    super.key,
    required Animation<double> animation,
    required this.builder,
  }) : super(listenable: animation);

  @override
  Widget build(BuildContext context) {
    return builder(context, null);
  }
}

// ---------------------------------------------------------------------------
// Match card
// ---------------------------------------------------------------------------

class _MatchCard extends StatelessWidget {
  final MatchWithProfile match;
  final VoidCallback onTap;

  const _MatchCard({required this.match, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final profile = match.otherUser;
    final photoUrl =
        profile.photos.isNotEmpty ? profile.photos.first.url : null;

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          color: FeelsColors.bgSecondary,
          border: Border(
            bottom: BorderSide(color: FeelsColors.border, width: 0.5),
          ),
        ),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: FeelsColors.bgTertiary,
                image: photoUrl != null
                    ? DecorationImage(
                        image: NetworkImage(photoUrl),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: photoUrl == null
                  ? const Icon(
                      Icons.person,
                      color: FeelsColors.textTertiary,
                      size: 28,
                    )
                  : null,
            ),

            const SizedBox(width: 12),

            // Name + last message
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: FeelsColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    match.lastMessage?.content ?? 'Say hi!',
                    style: TextStyle(
                      fontSize: 14,
                      color: match.lastMessage != null
                          ? FeelsColors.textSecondary
                          : FeelsColors.textTertiary,
                      fontStyle: match.lastMessage == null
                          ? FontStyle.italic
                          : FontStyle.normal,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            const SizedBox(width: 8),

            // Time + unread badge column
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _timeAgo(match.sortTime),
                  style: TextStyle(
                    fontSize: 12,
                    color: match.unreadCount > 0
                        ? FeelsColors.primary
                        : FeelsColors.textTertiary,
                  ),
                ),
                const SizedBox(height: 6),
                if (match.unreadCount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: FeelsColors.error,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      match.unreadCount > 99
                          ? '99+'
                          : match.unreadCount.toString(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: FeelsColors.textPrimary,
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    if (diff.inDays < 7) return '${diff.inDays}d';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()}w';
    return '${(diff.inDays / 30).floor()}mo';
  }
}
