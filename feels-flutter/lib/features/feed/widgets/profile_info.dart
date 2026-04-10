import 'package:flutter/material.dart';

import '../../../core/theme/theme.dart';
import '../domain/models/feed_profile.dart';

/// Scrollable info section below the photo gallery inside the swipe card.
///
/// Layout:
///   1. Name (32px/600) + Age (24px/400)
///   2. Distance
///   3. Info bar: gender . location . looking for
///   4. Detail tags (pills)
///   5. Bio text (15px)
///   6. Prompts in cards
///   7. Interest / looking-for tags
class ProfileInfo extends StatelessWidget {
  final FeedProfile profile;

  const ProfileInfo({super.key, required this.profile});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(
        FeelsSpacing.s4,
        FeelsSpacing.s3,
        FeelsSpacing.s4,
        FeelsSpacing.s4,
      ),
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ------------------------------------------------------------------
          // 1. Name + Age
          // ------------------------------------------------------------------
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Flexible(
                child: Text(
                  profile.name,
                  style: const TextStyle(
                    fontSize: FeelsTypography.sizeH1,
                    fontWeight: FeelsTypography.weightHeading,
                    color: FeelsColors.textPrimary,
                    height: FeelsTypography.lineHeightHeading,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${profile.age}',
                style: const TextStyle(
                  fontSize: FeelsTypography.sizeH2,
                  fontWeight: FeelsTypography.weightNormal,
                  color: FeelsColors.textSecondary,
                  height: FeelsTypography.lineHeightHeading,
                ),
              ),
              if (profile.isVerified) ...[
                const SizedBox(width: 6),
                const Icon(
                  Icons.verified,
                  color: FeelsColors.tertiary,
                  size: 20,
                ),
              ],
            ],
          ),

          // ------------------------------------------------------------------
          // 2. Distance
          // ------------------------------------------------------------------
          if (profile.distance != null) ...[
            const SizedBox(height: 2),
            Text(
              '${profile.distance} mi away',
              style: const TextStyle(
                fontSize: FeelsTypography.sizeSm,
                color: FeelsColors.textTertiary,
              ),
            ),
          ],

          const SizedBox(height: 8),

          // ------------------------------------------------------------------
          // 3. Info bar: gender . location . looking for
          // ------------------------------------------------------------------
          _InfoBar(profile: profile),

          // ------------------------------------------------------------------
          // 4. Detail tags (pills)
          // ------------------------------------------------------------------
          if (_hasDetailTags) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _buildDetailTags(),
            ),
          ],

          // ------------------------------------------------------------------
          // 5. Bio
          // ------------------------------------------------------------------
          if (profile.bio.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              profile.bio,
              style: const TextStyle(
                fontSize: FeelsTypography.sizeBase,
                fontWeight: FeelsTypography.weightNormal,
                color: FeelsColors.textPrimary,
                height: FeelsTypography.lineHeightBody,
              ),
            ),
          ],

          // ------------------------------------------------------------------
          // 6. Prompts in cards
          // ------------------------------------------------------------------
          if (profile.prompts.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...profile.prompts.map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _PromptCard(question: p.question, answer: p.answer),
                )),
          ],

          // ------------------------------------------------------------------
          // 7. Looking-for tags
          // ------------------------------------------------------------------
          if (profile.lookingFor.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: profile.lookingFor
                  .map((tag) => _Pill(label: tag, accent: true))
                  .toList(),
            ),
          ],

          // Bottom breathing room.
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Detail tags — zodiac, religion, kids, alcohol, weed, work, etc.
  // ---------------------------------------------------------------------------

  bool get _hasDetailTags =>
      profile.zodiac != null ||
      profile.religion != null ||
      profile.hasKids != null ||
      profile.wantsKids != null ||
      profile.alcohol != null ||
      profile.weed != null ||
      profile.workForMoney != null ||
      profile.workForPassion != null ||
      profile.genderTags.isNotEmpty;

  List<Widget> _buildDetailTags() {
    final tags = <Widget>[];

    void add(String? value, IconData? icon) {
      if (value == null || value.isEmpty) return;
      tags.add(_Pill(label: value, icon: icon));
    }

    add(profile.zodiac, Icons.auto_awesome);
    add(profile.religion, null);
    if (profile.hasKids == true) {
      tags.add(const _Pill(label: 'Has kids', icon: Icons.child_care));
    }
    add(profile.wantsKids, Icons.child_friendly);
    add(profile.alcohol, Icons.local_bar);
    add(profile.weed, Icons.eco);
    add(profile.workForMoney, Icons.work_outline);
    add(profile.workForPassion, Icons.favorite_border);

    for (final tag in profile.genderTags) {
      tags.add(_Pill(label: tag));
    }

    return tags;
  }
}

// ---------------------------------------------------------------------------
// Info bar
// ---------------------------------------------------------------------------

class _InfoBar extends StatelessWidget {
  final FeedProfile profile;

  const _InfoBar({required this.profile});

  @override
  Widget build(BuildContext context) {
    final parts = <String>[];
    if (profile.genderIdentity != null && profile.genderIdentity!.isNotEmpty) {
      parts.add(profile.genderIdentity!);
    } else {
      parts.add(profile.gender);
    }
    if (profile.neighborhood != null && profile.neighborhood!.isNotEmpty) {
      parts.add(profile.neighborhood!);
    }
    if (profile.lookingFor.isNotEmpty) {
      parts.add(profile.lookingFor.first);
    }

    return Text(
      parts.join(' \u00B7 '), // middle dot separator
      style: const TextStyle(
        fontSize: FeelsTypography.sizeSm,
        color: FeelsColors.textSecondary,
        height: FeelsTypography.lineHeightCaption,
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}

// ---------------------------------------------------------------------------
// Pill tag
// ---------------------------------------------------------------------------

class _Pill extends StatelessWidget {
  final String label;
  final IconData? icon;
  final bool accent;

  const _Pill({
    required this.label,
    this.icon,
    this.accent = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: accent ? FeelsColors.primaryMuted : FeelsColors.bgTertiary,
        borderRadius: FeelsRadius.fullAll,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 12,
              color: accent ? FeelsColors.primary : FeelsColors.textSecondary,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: FeelsTypography.sizeSm,
              color: accent ? FeelsColors.primary : FeelsColors.textPrimary,
              fontWeight: FeelsTypography.weightNormal,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Prompt card
// ---------------------------------------------------------------------------

class _PromptCard extends StatelessWidget {
  final String question;
  final String answer;

  const _PromptCard({required this.question, required this.answer});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: FeelsColors.bgTertiary,
        borderRadius: FeelsRadius.mdAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            question,
            style: const TextStyle(
              fontSize: FeelsTypography.sizeSm,
              fontWeight: FeelsTypography.weightHeading,
              color: FeelsColors.primary,
              height: FeelsTypography.lineHeightCaption,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            answer,
            style: const TextStyle(
              fontSize: FeelsTypography.sizeBase,
              fontWeight: FeelsTypography.weightNormal,
              color: FeelsColors.textPrimary,
              height: FeelsTypography.lineHeightBody,
            ),
          ),
        ],
      ),
    );
  }
}
