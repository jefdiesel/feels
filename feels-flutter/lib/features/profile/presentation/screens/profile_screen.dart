import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/theme.dart';
import '../../domain/models/profile_models.dart';
import '../../widgets/photo_grid.dart';
import '../providers/profile_provider.dart';
import 'edit_profile_screen.dart';

/// Main profile screen — shows own profile with avatar, completeness ring,
/// grouped card sections, hero photo, and skeleton loader.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final ps = ref.read(profileProvider);
      if (!ps.hasProfile && !ps.isLoading) {
        ref.read(profileProvider.notifier).loadProfile();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ps = ref.watch(profileProvider);

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: ps.isLoading && !ps.hasProfile
          ? const _SkeletonLoader()
          : ps.error != null && !ps.hasProfile
              ? ps.error!.contains('404') ||
                      ps.error!.toLowerCase().contains('not found')
                  ? const _WelcomeState()
                  : _ErrorBody(
                      error: ps.error!,
                      onRetry: () => ref
                          .read(profileProvider.notifier)
                          .loadProfile(forceRefresh: true),
                    )
              : ps.hasProfile
                  ? RefreshIndicator(
                      color: FeelsColors.primary,
                      backgroundColor: FeelsColors.bgSecondary,
                      onRefresh: () => ref
                          .read(profileProvider.notifier)
                          .loadProfile(forceRefresh: true),
                      child: _ProfileBody(
                        profile: ps.profile!,
                        preferences: ps.preferences,
                        age: ps.age,
                        isReorderMode: ps.isReorderMode,
                        isSaving: ps.isSaving,
                      ),
                    )
                  : const SizedBox.shrink(),
    );
  }
}

// ---------------------------------------------------------------------------
// Profile completeness calculation
// ---------------------------------------------------------------------------

double _calculateCompleteness(Profile profile) {
  double score = 0;
  if (profile.photos.isNotEmpty) score += 0.20;
  if (profile.photos.length >= 3) score += 0.10;
  if (profile.name.isNotEmpty) score += 0.15;
  if (profile.bio.isNotEmpty) score += 0.15;
  if (profile.prompts.isNotEmpty) score += 0.15;
  if (profile.lookingFor.isNotEmpty) score += 0.10;
  // Lifestyle tags: any of zodiac, religion, alcohol, weed, hasKids, wantsKids
  final hasLifestyle = profile.zodiac != null ||
      profile.religion != null ||
      profile.alcohol != null ||
      profile.weed != null ||
      profile.hasKids != null ||
      profile.wantsKids != null;
  if (hasLifestyle) score += 0.15;
  return score.clamp(0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Profile body (scrollable content)
// ---------------------------------------------------------------------------

class _ProfileBody extends ConsumerWidget {
  final Profile profile;
  final Preferences? preferences;
  final int? age;
  final bool isReorderMode;
  final bool isSaving;

  const _ProfileBody({
    required this.profile,
    this.preferences,
    this.age,
    required this.isReorderMode,
    required this.isSaving,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sortedPhotos = List<Photo>.from(profile.photos)
      ..sort((a, b) => a.position.compareTo(b.position));
    final mainPhotoUrl =
        sortedPhotos.isNotEmpty ? sortedPhotos.first.url : null;
    final completeness = _calculateCompleteness(profile);

    return ListView(
      padding: const EdgeInsets.symmetric(
        horizontal: FeelsLayout.screenPaddingHorizontal,
        vertical: FeelsSpacing.s4,
      ),
      children: [
        // --- Avatar with completeness ring ---
        _AvatarWithCompleteness(
          photoUrl: mainPhotoUrl,
          name: profile.name,
          age: age,
          isVerified: profile.isVerified,
          completeness: completeness,
        ),

        const SizedBox(height: FeelsSpacing.s5),

        // --- "Your Profile" card: hero photo + bio + prompts ---
        _GroupedCard(
          title: 'Your Profile',
          actionLabel: 'Edit',
          onAction: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const EditProfileScreen()),
            );
          },
          children: [
            // Hero photo treatment (view mode) or grid (edit/reorder mode)
            if (isReorderMode) ...[
              _ReorderHeader(
                photoCount: sortedPhotos.length,
                onDone: () =>
                    ref.read(profileProvider.notifier).toggleReorderMode(),
              ),
              const SizedBox(height: FeelsSpacing.s3),
              if (isSaving)
                const Padding(
                  padding: EdgeInsets.only(bottom: FeelsSpacing.s2),
                  child: LinearProgressIndicator(minHeight: 2),
                ),
              const PhotoGrid(),
            ] else ...[
              // Hero photo (first photo large)
              if (sortedPhotos.isNotEmpty) ...[
                _HeroPhoto(photo: sortedPhotos.first),
                if (sortedPhotos.length > 1) ...[
                  const SizedBox(height: FeelsSpacing.s3),
                  _PhotoThumbnailRow(
                    photos: sortedPhotos.sublist(1),
                  ),
                ],
              ] else
                _EmptyPhotosHint(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                          builder: (_) => const EditProfileScreen()),
                    );
                  },
                ),
            ],

            // Bio
            if (profile.bio.isNotEmpty) ...[
              const SizedBox(height: FeelsSpacing.s4),
              Text(
                profile.bio,
                style: FeelsTypography.body,
              ),
            ],

            // Prompts
            if (profile.prompts.isNotEmpty) ...[
              const SizedBox(height: FeelsSpacing.s4),
              ...profile.prompts.map((p) => Padding(
                    padding: const EdgeInsets.only(bottom: FeelsSpacing.s3),
                    child: _PromptCard(prompt: p),
                  )),
            ],
          ],
        ),

        const SizedBox(height: FeelsSpacing.s4),

        // --- "Preferences" card ---
        if (preferences != null)
          _GroupedCard(
            title: 'Preferences',
            actionLabel: 'Edit',
            onAction: () => context.push('/preferences'),
            children: [
              _PreferencesSummary(preferences: preferences!),
            ],
          ),

        const SizedBox(height: FeelsSpacing.s4),

        // --- "About You" card: looking for + lifestyle ---
        _GroupedCard(
          title: 'About You',
          actionLabel: 'Edit',
          onAction: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const EditProfileScreen()),
            );
          },
          children: [
            if (profile.lookingFor.isNotEmpty) ...[
              Text(
                'Looking for',
                style: FeelsTypography.bodySmall.copyWith(
                  color: FeelsColors.primary,
                  fontWeight: FeelsTypography.weightHeading,
                ),
              ),
              const SizedBox(height: FeelsSpacing.s2),
              Wrap(
                spacing: FeelsSpacing.s2,
                runSpacing: FeelsSpacing.s2,
                children: profile.lookingFor
                    .map((tag) => _Tag(label: tag))
                    .toList(),
              ),
            ],
            if (_hasLifestyleTags(profile)) ...[
              if (profile.lookingFor.isNotEmpty)
                const SizedBox(height: FeelsSpacing.s4),
              Text(
                'Lifestyle',
                style: FeelsTypography.bodySmall.copyWith(
                  color: FeelsColors.primary,
                  fontWeight: FeelsTypography.weightHeading,
                ),
              ),
              const SizedBox(height: FeelsSpacing.s2),
              Wrap(
                spacing: FeelsSpacing.s2,
                runSpacing: FeelsSpacing.s2,
                children: _buildLifestyleTags(profile),
              ),
            ],
            if (profile.lookingFor.isEmpty && !_hasLifestyleTags(profile))
              Text(
                'Add details about yourself to help people find you.',
                style: FeelsTypography.bodySmall,
              ),
          ],
        ),

        const SizedBox(height: FeelsSpacing.s5),

        // --- Edit profile button ---
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const EditProfileScreen()),
              );
            },
            child: const Text('Edit Profile'),
          ),
        ),

        const SizedBox(height: FeelsSpacing.s7),
      ],
    );
  }

  bool _hasLifestyleTags(Profile profile) {
    return profile.zodiac != null ||
        profile.religion != null ||
        profile.alcohol != null ||
        profile.weed != null ||
        profile.hasKids != null ||
        profile.wantsKids != null;
  }

  List<Widget> _buildLifestyleTags(Profile profile) {
    final tags = <String>[];
    if (profile.zodiac != null) tags.add(profile.zodiac!);
    if (profile.religion != null) tags.add(profile.religion!);
    if (profile.alcohol != null) tags.add(profile.alcohol!);
    if (profile.weed != null) tags.add(profile.weed!);
    if (profile.hasKids != null) {
      tags.add(profile.hasKids! ? 'Has kids' : 'No kids');
    }
    if (profile.wantsKids != null) tags.add(profile.wantsKids!);
    return tags.map((t) => _Tag(label: t)).toList();
  }
}

// ---------------------------------------------------------------------------
// Avatar with completeness ring
// ---------------------------------------------------------------------------

class _AvatarWithCompleteness extends StatelessWidget {
  final String? photoUrl;
  final String name;
  final int? age;
  final bool isVerified;
  final double completeness;

  const _AvatarWithCompleteness({
    this.photoUrl,
    required this.name,
    this.age,
    required this.isVerified,
    required this.completeness,
  });

  @override
  Widget build(BuildContext context) {
    final isComplete = completeness >= 1.0;
    final pct = (completeness * 100).round();

    return Column(
      children: [
        SizedBox(
          width: 128,
          height: 128,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Completeness ring
              SizedBox(
                width: 128,
                height: 128,
                child: CustomPaint(
                  painter: _CompletenessRingPainter(
                    progress: completeness,
                    color: FeelsColors.primary,
                    trackColor: FeelsColors.bgTertiary,
                    strokeWidth: 3.0,
                  ),
                ),
              ),
              // Avatar
              Container(
                width: 112,
                height: 112,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: photoUrl != null
                      ? CachedNetworkImage(
                          imageUrl: photoUrl!,
                          fit: BoxFit.cover,
                          width: 112,
                          height: 112,
                          placeholder: (_, __) => Container(
                            color: FeelsColors.bgTertiary,
                          ),
                          errorWidget: (_, __, ___) => Container(
                            color: FeelsColors.bgTertiary,
                            child: const Icon(
                              Icons.person,
                              size: 44,
                              color: FeelsColors.textTertiary,
                            ),
                          ),
                        )
                      : Container(
                          color: FeelsColors.bgTertiary,
                          child: const Icon(
                            Icons.person,
                            size: 44,
                            color: FeelsColors.textTertiary,
                          ),
                        ),
                ),
              ),
              // Checkmark badge if complete
              if (isComplete)
                Positioned(
                  bottom: 2,
                  right: 2,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: const BoxDecoration(
                      color: FeelsColors.success,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      size: 16,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: FeelsSpacing.s3),
        // Name + age
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              age != null ? '$name, $age' : name,
              style: FeelsTypography.h2,
            ),
            if (isVerified) ...[
              const SizedBox(width: FeelsSpacing.s1),
              const Icon(
                Icons.verified,
                size: 20,
                color: FeelsColors.tertiary,
              ),
            ],
          ],
        ),
        // Completeness text
        if (!isComplete) ...[
          const SizedBox(height: FeelsSpacing.s1),
          Text(
            '$pct% complete',
            style: FeelsTypography.bodySmall.copyWith(
              color: FeelsColors.primary,
              fontWeight: FeelsTypography.weightHeading,
            ),
          ),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Completeness ring painter
// ---------------------------------------------------------------------------

class _CompletenessRingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color trackColor;
  final double strokeWidth;

  _CompletenessRingPainter({
    required this.progress,
    required this.color,
    required this.trackColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    // Track
    final trackPaint = Paint()
      ..color = trackColor
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(center, radius, trackPaint);

    // Progress arc
    if (progress > 0) {
      final progressPaint = Paint()
        ..color = color
        ..strokeWidth = strokeWidth
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2,
        2 * math.pi * progress,
        false,
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _CompletenessRingPainter old) =>
      progress != old.progress ||
      color != old.color ||
      trackColor != old.trackColor ||
      strokeWidth != old.strokeWidth;
}

// ---------------------------------------------------------------------------
// Grouped card section
// ---------------------------------------------------------------------------

class _GroupedCard extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  final List<Widget> children;

  const _GroupedCard({
    required this.title,
    this.actionLabel,
    this.onAction,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(FeelsLayout.cardPadding),
      decoration: BoxDecoration(
        color: FeelsColors.bgSecondary,
        borderRadius: FeelsRadius.lgAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Text(
                title,
                style: FeelsTypography.title,
              ),
              const Spacer(),
              if (actionLabel != null)
                GestureDetector(
                  onTap: onAction,
                  child: Text(
                    actionLabel!,
                    style: FeelsTypography.bodySmall.copyWith(
                      color: FeelsColors.primary,
                      fontWeight: FeelsTypography.weightHeading,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: FeelsSpacing.s4),
          // Content
          ...children,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Hero photo (full width, 200px, rounded top)
// ---------------------------------------------------------------------------

class _HeroPhoto extends StatelessWidget {
  final Photo photo;

  const _HeroPhoto({required this.photo});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: FeelsRadius.mdAll,
      child: CachedNetworkImage(
        imageUrl: photo.url,
        fit: BoxFit.cover,
        width: double.infinity,
        height: 200,
        placeholder: (_, __) => Container(
          height: 200,
          color: FeelsColors.bgTertiary,
          child: const Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ),
        ),
        errorWidget: (_, __, ___) => Container(
          height: 200,
          color: FeelsColors.bgTertiary,
          child: const Icon(
            Icons.broken_image_outlined,
            size: 32,
            color: FeelsColors.textTertiary,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Photo thumbnail row (horizontal scroll, 80x80)
// ---------------------------------------------------------------------------

class _PhotoThumbnailRow extends StatelessWidget {
  final List<Photo> photos;

  const _PhotoThumbnailRow({required this.photos});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 80,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: photos.length,
        separatorBuilder: (_, __) => const SizedBox(width: FeelsSpacing.s2),
        itemBuilder: (_, index) {
          return ClipRRect(
            borderRadius: FeelsRadius.smAll,
            child: CachedNetworkImage(
              imageUrl: photos[index].url,
              fit: BoxFit.cover,
              width: 80,
              height: 80,
              placeholder: (_, __) => Container(
                width: 80,
                height: 80,
                color: FeelsColors.bgTertiary,
              ),
              errorWidget: (_, __, ___) => Container(
                width: 80,
                height: 80,
                color: FeelsColors.bgTertiary,
                child: const Icon(
                  Icons.broken_image_outlined,
                  size: 20,
                  color: FeelsColors.textTertiary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty photos hint
// ---------------------------------------------------------------------------

class _EmptyPhotosHint extends StatelessWidget {
  final VoidCallback? onTap;

  const _EmptyPhotosHint({this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: FeelsColors.bgTertiary,
          borderRadius: FeelsRadius.mdAll,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.add_a_photo_outlined,
                size: 28,
                color: FeelsColors.textTertiary,
              ),
              const SizedBox(height: FeelsSpacing.s2),
              Text(
                'Add your first photo',
                style: FeelsTypography.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Reorder header (shown inside card during reorder mode)
// ---------------------------------------------------------------------------

class _ReorderHeader extends StatelessWidget {
  final int photoCount;
  final VoidCallback onDone;

  const _ReorderHeader({
    required this.photoCount,
    required this.onDone,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          'Reorder Photos',
          style: FeelsTypography.bodySmall.copyWith(
            color: FeelsColors.primary,
            fontWeight: FeelsTypography.weightHeading,
          ),
        ),
        const SizedBox(width: FeelsSpacing.s2),
        Text(
          '$photoCount/$kMaxPhotos',
          style: FeelsTypography.caption.copyWith(
            color: FeelsColors.textTertiary,
          ),
        ),
        const Spacer(),
        GestureDetector(
          onTap: onDone,
          child: Text(
            'Done',
            style: FeelsTypography.bodySmall.copyWith(
              color: FeelsColors.primary,
              fontWeight: FeelsTypography.weightHeading,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Preferences summary (inside Preferences card)
// ---------------------------------------------------------------------------

class _PreferencesSummary extends StatelessWidget {
  final Preferences preferences;

  const _PreferencesSummary({required this.preferences});

  @override
  Widget build(BuildContext context) {
    final genders = preferences.gendersSeeking.isNotEmpty
        ? preferences.gendersSeeking.join(', ')
        : 'Any';
    final ageRange = '${preferences.ageMin}-${preferences.ageMax}';
    final distance = '${preferences.distanceMiles} mi';

    return Row(
      children: [
        Expanded(
          child: Text(
            '$genders  ·  $ageRange  ·  $distance',
            style: FeelsTypography.bodySmall,
          ),
        ),
        const Icon(
          Icons.chevron_right,
          color: FeelsColors.textTertiary,
          size: 20,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Prompt card (inside grouped card)
// ---------------------------------------------------------------------------

class _PromptCard extends StatelessWidget {
  final Prompt prompt;

  const _PromptCard({required this.prompt});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(FeelsSpacing.s3),
      decoration: BoxDecoration(
        color: FeelsColors.bgTertiary,
        borderRadius: FeelsRadius.mdAll,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            prompt.question,
            style: FeelsTypography.bodySmall.copyWith(
              color: FeelsColors.primary,
              fontWeight: FeelsTypography.weightHeading,
            ),
          ),
          const SizedBox(height: FeelsSpacing.s1),
          Text(
            prompt.answer,
            style: FeelsTypography.body,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tag chip
// ---------------------------------------------------------------------------

class _Tag extends StatelessWidget {
  final String label;

  const _Tag({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: FeelsSpacing.s3,
        vertical: FeelsSpacing.s1,
      ),
      decoration: BoxDecoration(
        color: FeelsColors.bgTertiary,
        borderRadius: FeelsRadius.fullAll,
        border: Border.all(color: FeelsColors.border),
      ),
      child: Text(
        label,
        style: FeelsTypography.bodySmall.copyWith(
          color: FeelsColors.textPrimary,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

class _SkeletonLoader extends StatefulWidget {
  const _SkeletonLoader();

  @override
  State<_SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<_SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _shimmer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    _shimmer = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _shimmer,
      builder: (context, _) {
        return Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: FeelsLayout.screenPaddingHorizontal,
            vertical: FeelsSpacing.s4,
          ),
          child: Column(
            children: [
              // Avatar circle
              _shimmerBox(width: 128, height: 128, isCircle: true),
              const SizedBox(height: FeelsSpacing.s3),
              // Name bar
              _shimmerBox(width: 160, height: 24),
              const SizedBox(height: FeelsSpacing.s2),
              // Completeness text
              _shimmerBox(width: 100, height: 16),
              const SizedBox(height: FeelsSpacing.s5),
              // Card skeleton 1
              _shimmerBox(width: double.infinity, height: 280),
              const SizedBox(height: FeelsSpacing.s4),
              // Card skeleton 2
              _shimmerBox(width: double.infinity, height: 72),
              const SizedBox(height: FeelsSpacing.s4),
              // Card skeleton 3
              _shimmerBox(width: double.infinity, height: 120),
            ],
          ),
        );
      },
    );
  }

  Widget _shimmerBox({
    required double width,
    required double height,
    bool isCircle = false,
  }) {
    final baseColor = FeelsColors.bgTertiary;
    final highlightColor = FeelsColors.bgSecondary;
    final t = _shimmer.value;
    final color = Color.lerp(baseColor, highlightColor, t)!;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color,
        shape: isCircle ? BoxShape.circle : BoxShape.rectangle,
        borderRadius: isCircle ? null : FeelsRadius.lgAll,
      ),
    );
  }
}


// ---------------------------------------------------------------------------
// Welcome / create profile state
// ---------------------------------------------------------------------------

class _WelcomeState extends StatefulWidget {
  const _WelcomeState();

  @override
  State<_WelcomeState> createState() => _WelcomeStateState();
}

class _WelcomeStateState extends State<_WelcomeState>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;
  late final Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.02).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding:
            const EdgeInsets.all(FeelsLayout.screenPaddingHorizontal),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Welcome to feels',
              style: FeelsTypography.h2.copyWith(
                color: FeelsColors.primary,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s3),
            Text(
              "Let's build your profile so people can find you",
              textAlign: TextAlign.center,
              style: FeelsTypography.body.copyWith(
                color: FeelsColors.textSecondary,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s6),
            AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (context, _) {
                return Transform.scale(
                  scale: _pulseAnimation.value,
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.go('/onboarding'),
                      child: const Text('Get Started'),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Error body
// ---------------------------------------------------------------------------

class _ErrorBody extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;

  const _ErrorBody({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(FeelsLayout.screenPaddingHorizontal),
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
              error,
              style: FeelsTypography.body,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: FeelsSpacing.s4),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Simple onboarding (minimal profile creation) — kept for backward compat
// ---------------------------------------------------------------------------

class SimpleOnboarding extends ConsumerStatefulWidget {
  const SimpleOnboarding({super.key});

  @override
  ConsumerState<SimpleOnboarding> createState() => _SimpleOnboardingState();
}

class _SimpleOnboardingState extends ConsumerState<SimpleOnboarding> {
  final _nameController = TextEditingController();
  final _bioController = TextEditingController();
  String _gender = 'man';
  DateTime? _dob;
  bool _saving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(1940),
      lastDate: DateTime(now.year - 18),
    );
    if (picked != null) setState(() => _dob = picked);
  }

  Future<void> _save() async {
    if (_nameController.text.trim().isEmpty || _dob == null) return;
    setState(() => _saving = true);
    try {
      await ref.read(profileProvider.notifier).createProfile(
            name: _nameController.text.trim(),
            dob:
                '${_dob!.year}-${_dob!.month.toString().padLeft(2, '0')}-${_dob!.day.toString().padLeft(2, '0')}',
            gender: _gender,
            bio: _bioController.text.trim(),
            zipCode: '10001',
          );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(title: const Text('Create Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(FeelsSpacing.s5),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Name',
              style: FeelsTypography.bodySmall.copyWith(
                fontWeight: FeelsTypography.weightHeading,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s2),
            TextField(
              controller: _nameController,
              style: FeelsTypography.body,
              decoration: const InputDecoration(hintText: 'Your first name'),
            ),
            const SizedBox(height: FeelsSpacing.s5),
            Text(
              'Birthday',
              style: FeelsTypography.bodySmall.copyWith(
                fontWeight: FeelsTypography.weightHeading,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s2),
            GestureDetector(
              onTap: _pickDob,
              child: Container(
                width: double.infinity,
                height: FeelsLayout.inputHeight,
                padding: const EdgeInsets.symmetric(
                    horizontal: FeelsLayout.inputPadding),
                decoration: BoxDecoration(
                  color: FeelsColors.bgTertiary,
                  borderRadius: FeelsRadius.mdAll,
                  border: Border.all(color: FeelsColors.border),
                ),
                alignment: Alignment.centerLeft,
                child: Text(
                  _dob != null
                      ? '${_dob!.month}/${_dob!.day}/${_dob!.year}'
                      : 'Tap to select',
                  style: FeelsTypography.body.copyWith(
                    color: _dob != null
                        ? FeelsColors.textPrimary
                        : FeelsColors.textDisabled,
                  ),
                ),
              ),
            ),
            const SizedBox(height: FeelsSpacing.s5),
            Text(
              'Gender',
              style: FeelsTypography.bodySmall.copyWith(
                fontWeight: FeelsTypography.weightHeading,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s2),
            Wrap(
              spacing: FeelsSpacing.s2,
              children: ['man', 'woman', 'non_binary'].map((g) {
                final selected = _gender == g;
                return ChoiceChip(
                  label: Text(g.replaceAll('_', '-')),
                  selected: selected,
                  selectedColor: FeelsColors.primary,
                  backgroundColor: FeelsColors.bgTertiary,
                  labelStyle: TextStyle(
                    color: selected
                        ? FeelsColors.textPrimary
                        : FeelsColors.textSecondary,
                  ),
                  onSelected: (_) => setState(() => _gender = g),
                );
              }).toList(),
            ),
            const SizedBox(height: FeelsSpacing.s5),
            Text(
              'Bio',
              style: FeelsTypography.bodySmall.copyWith(
                fontWeight: FeelsTypography.weightHeading,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s2),
            TextField(
              controller: _bioController,
              maxLines: 3,
              style: FeelsTypography.body,
              decoration: const InputDecoration(
                hintText: 'Tell people about yourself...',
              ),
            ),
            const SizedBox(height: FeelsSpacing.s6),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: FeelsColors.textPrimary,
                        ),
                      )
                    : const Text('Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
