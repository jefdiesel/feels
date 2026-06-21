import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/theme.dart';
import '../../feed/presentation/providers/feed_provider.dart';
import '../data/anchor_models.dart';
import '../data/anchor_repository.dart';

/// Explore: browse NYC neighborhoods by how many people are anchored there.
/// Tapping one opens the feed scoped to that neighborhood.
class NeighborhoodsScreen extends ConsumerWidget {
  const NeighborhoodsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(neighborhoodsProvider);
    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(title: const Text('Neighborhoods')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(FeelsSpacing.s6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Could not load neighborhoods',
                  style: TextStyle(color: FeelsColors.textSecondary),
                ),
                const SizedBox(height: FeelsSpacing.s4),
                OutlinedButton(
                  onPressed: () => ref.invalidate(neighborhoodsProvider),
                  child: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
        data: (nabes) {
          if (nabes.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(FeelsSpacing.s6),
                child: Text(
                  'No active neighborhoods yet — be the first.',
                  style: TextStyle(color: FeelsColors.textSecondary),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.symmetric(
              vertical: FeelsSpacing.s3,
              horizontal: FeelsLayout.screenPaddingHorizontal,
            ),
            itemCount: nabes.length,
            separatorBuilder: (_, __) =>
                const SizedBox(height: FeelsSpacing.s2),
            itemBuilder: (_, i) {
              final nabe = nabes[i];
              return _NabeTile(
                nabe: nabe,
                onTap: () {
                  ref
                      .read(feedProvider.notifier)
                      .browseNabe(nabe.id, nabe.name);
                  context.go('/home/feed');
                },
              );
            },
          );
        },
      ),
    );
  }
}

class _NabeTile extends StatelessWidget {
  final NeighborhoodStat nabe;
  final VoidCallback onTap;

  const _NabeTile({required this.nabe, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: FeelsRadius.mdAll,
      child: Container(
        padding: const EdgeInsets.all(FeelsSpacing.s4),
        decoration: BoxDecoration(
          color: FeelsColors.bgSecondary,
          borderRadius: FeelsRadius.mdAll,
        ),
        child: Row(
          children: [
            const Icon(Icons.location_city,
                size: 20, color: FeelsColors.primary),
            const SizedBox(width: FeelsSpacing.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    nabe.name,
                    style: FeelsTypography.body.copyWith(
                      fontWeight: FeelsTypography.weightHeading,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (nabe.borough.isNotEmpty)
                    Text(
                      nabe.borough,
                      style: FeelsTypography.bodySmall.copyWith(
                        color: FeelsColors.textTertiary,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: FeelsSpacing.s2),
            Text(
              nabe.users == 1 ? '1 here' : '${nabe.users} here',
              style: FeelsTypography.bodySmall.copyWith(
                color: FeelsColors.primary,
                fontWeight: FeelsTypography.weightHeading,
              ),
            ),
            const SizedBox(width: FeelsSpacing.s2),
            const Icon(Icons.chevron_right,
                size: 18, color: FeelsColors.textTertiary),
          ],
        ),
      ),
    );
  }
}
