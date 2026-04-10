import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/theme.dart';
import '../../../profile/presentation/providers/profile_provider.dart';
import '../providers/onboarding_provider.dart';

// ---------------------------------------------------------------------------
// Prompt questions (shared with edit_profile_screen)
// ---------------------------------------------------------------------------

const _promptQuestions = [
  'My simple pleasures...',
  'A life goal of mine...',
  'I geek out on...',
  'My most controversial opinion...',
  'My go-to karaoke song...',
  'The way to win me over...',
  'My love language is...',
  'Two truths and a lie...',
  'I\'m looking for someone who...',
  'My biggest flex...',
];

const _primaryGenders = ['Woman', 'Man', 'Non-binary'];
const _expandedGenders = [
  'Transwoman',
  'Transman',
  'Genderqueer',
  'Genderfluid',
  'Agender',
  'Two-spirit',
];

const _allGenderOptions = [
  'Woman',
  'Man',
  'Non-binary',
  'Transwoman',
  'Transman',
  'Genderqueer',
  'Genderfluid',
  'Agender',
  'Two-spirit',
];

// ---------------------------------------------------------------------------
// Onboarding Screen
// ---------------------------------------------------------------------------

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _animateToPage(int page) {
    HapticFeedback.lightImpact();
    _pageController.animateToPage(
      page,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    final ob = ref.watch(onboardingProvider);

    // Sync page controller when step changes from provider (e.g. back button)
    ref.listen<OnboardingState>(onboardingProvider, (prev, next) {
      if (prev?.currentStep != next.currentStep &&
          _pageController.hasClients) {
        _animateToPage(next.currentStep);
      }
    });

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      body: SafeArea(
        child: Column(
          children: [
            // --- Progress bar ---
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: FeelsLayout.screenPaddingHorizontal,
                vertical: FeelsSpacing.s3,
              ),
              child: _ProgressBar(currentStep: ob.currentStep, totalSteps: 4),
            ),

            // --- Pages ---
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (i) {
                  ref.read(onboardingProvider.notifier).goToStep(i);
                },
                children: const [
                  _PhotosStep(),
                  _BasicsStep(),
                  _PersonalityStep(),
                  _PreferencesStep(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

class _ProgressBar extends StatelessWidget {
  final int currentStep;
  final int totalSteps;

  const _ProgressBar({required this.currentStep, required this.totalSteps});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(totalSteps, (i) {
        final isCompleted = i <= currentStep;
        return Expanded(
          child: Container(
            height: 3,
            margin: EdgeInsets.only(right: i < totalSteps - 1 ? 4 : 0),
            decoration: BoxDecoration(
              color: isCompleted ? FeelsColors.primary : FeelsColors.bgTertiary,
              borderRadius: FeelsRadius.fullAll,
            ),
          ),
        );
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Step wrapper with fade-in animation
// ---------------------------------------------------------------------------

class _StepScaffold extends StatefulWidget {
  final String title;
  final String subtitle;
  final Widget content;
  final Widget? bottomAction;
  final VoidCallback? onBack;
  final VoidCallback? onSkip;

  const _StepScaffold({
    required this.title,
    required this.subtitle,
    required this.content,
    this.bottomAction,
    this.onBack,
    this.onSkip,
  });

  @override
  State<_StepScaffold> createState() => _StepScaffoldState();
}

class _StepScaffoldState extends State<_StepScaffold>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fadeCtrl;
  late final Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);
    _fadeCtrl.forward();
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: Column(
        children: [
          // Header row: back + skip
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: FeelsSpacing.s2,
            ),
            child: Row(
              children: [
                if (widget.onBack != null)
                  IconButton(
                    onPressed: widget.onBack,
                    icon: const Icon(
                      Icons.arrow_back_ios_new,
                      size: 20,
                      color: FeelsColors.textSecondary,
                    ),
                  )
                else
                  const SizedBox(width: 48),
                const Spacer(),
                if (widget.onSkip != null)
                  TextButton(
                    onPressed: widget.onSkip,
                    child: Text(
                      'Skip',
                      style: FeelsTypography.body.copyWith(
                        color: FeelsColors.textSecondary,
                      ),
                    ),
                  )
                else
                  const SizedBox(width: 48),
              ],
            ),
          ),

          // Scrollable content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(
                horizontal: FeelsLayout.screenPaddingHorizontal,
              ),
              children: [
                const SizedBox(height: FeelsSpacing.s2),
                Text(widget.title, style: FeelsTypography.h1),
                const SizedBox(height: FeelsSpacing.s2),
                Text(widget.subtitle, style: FeelsTypography.bodySmall),
                const SizedBox(height: FeelsSpacing.s5),
                widget.content,
                const SizedBox(height: FeelsSpacing.s6),
              ],
            ),
          ),

          // Bottom action
          if (widget.bottomAction != null)
            Padding(
              padding: EdgeInsets.fromLTRB(
                FeelsLayout.screenPaddingHorizontal,
                FeelsSpacing.s2,
                FeelsLayout.screenPaddingHorizontal,
                FeelsSpacing.s4,
              ),
              child: widget.bottomAction!,
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Primary action button (reused across steps)
// ---------------------------------------------------------------------------

class _PrimaryButton extends StatelessWidget {
  final String label;
  final bool enabled;
  final bool isLoading;
  final VoidCallback? onPressed;

  const _PrimaryButton({
    required this.label,
    this.enabled = true,
    this.isLoading = false,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: FeelsLayout.buttonHeight,
      child: ElevatedButton(
        onPressed: enabled && !isLoading ? onPressed : null,
        style: ElevatedButton.styleFrom(
          backgroundColor:
              enabled ? FeelsColors.primary : FeelsColors.bgTertiary,
          foregroundColor: enabled
              ? FeelsColors.textPrimary
              : FeelsColors.textDisabled,
          shape: RoundedRectangleBorder(
            borderRadius: FeelsRadius.mdAll,
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: FeelsColors.textPrimary,
                ),
              )
            : Text(
                label,
                style: TextStyle(
                  fontSize: FeelsTypography.sizeBase,
                  fontWeight: FeelsTypography.weightHeading,
                ),
              ),
      ),
    );
  }
}

// ===========================================================================
// STEP 1: Photos
// ===========================================================================

class _PhotosStep extends ConsumerWidget {
  const _PhotosStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileState = ref.watch(profileProvider);
    final photos = profileState.sortedPhotos;
    final ob = ref.watch(onboardingProvider);

    // Keep onboarding state in sync with photo count
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (photos.length != ob.photoCount) {
        ref.read(onboardingProvider.notifier).setPhotoCount(photos.length);
      }
    });

    return _StepScaffold(
      title: 'First impressions matter',
      subtitle:
          'Add at least 2 photos to get started. Profiles with 3+ photos get 5x more matches.',
      content: Column(
        children: [
          // Hero camera icon area
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: FeelsColors.primaryMuted,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.camera_alt_rounded,
              size: 36,
              color: FeelsColors.primary,
            ),
          ),
          const SizedBox(height: FeelsSpacing.s5),

          // Photo grid (reuse existing pattern but inline for onboarding)
          _OnboardingPhotoGrid(photos: photos),

          const SizedBox(height: FeelsSpacing.s3),

          // Photo count
          Text(
            '${photos.length}/6 photos added',
            style: FeelsTypography.bodySmall.copyWith(
              color: photos.length >= 2
                  ? FeelsColors.success
                  : FeelsColors.textTertiary,
              fontWeight: FeelsTypography.weightHeading,
            ),
          ),

          if (photos.length >= 3)
            Padding(
              padding: const EdgeInsets.only(top: FeelsSpacing.s1),
              child: Text(
                'Looking great! More photos = more matches.',
                style: FeelsTypography.bodySmall.copyWith(
                  color: FeelsColors.tertiary,
                ),
              ),
            ),
        ],
      ),
      bottomAction: _PrimaryButton(
        label: 'Continue',
        enabled: ob.isStep0Valid,
        onPressed: () {
          ref.read(onboardingProvider.notifier).nextStep();
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Photo grid for onboarding (uses profileProvider for upload/delete)
// ---------------------------------------------------------------------------

class _OnboardingPhotoGrid extends ConsumerWidget {
  final List photos;

  const _OnboardingPhotoGrid({required this.photos});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 6,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: FeelsSpacing.s2,
        mainAxisSpacing: FeelsSpacing.s2,
        childAspectRatio: 3 / 4,
      ),
      itemBuilder: (context, index) {
        if (index < photos.length) {
          final photo = photos[index];
          return ClipRRect(
            borderRadius: FeelsRadius.mdAll,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  photo.url,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: FeelsColors.bgTertiary,
                    child: const Icon(
                      Icons.broken_image_outlined,
                      color: FeelsColors.textTertiary,
                    ),
                  ),
                ),
                // Delete button
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () {
                      ref
                          .read(profileProvider.notifier)
                          .deletePhoto(photo.id);
                    },
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: const BoxDecoration(
                        color: FeelsColors.overlay,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                // Main badge
                if (index == 0)
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
              ],
            ),
          );
        }

        // Empty slot
        return GestureDetector(
          onTap: () => _pickAndUpload(context, ref),
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

// ===========================================================================
// STEP 2: Basics
// ===========================================================================

class _BasicsStep extends ConsumerStatefulWidget {
  const _BasicsStep();

  @override
  ConsumerState<_BasicsStep> createState() => _BasicsStepState();
}

class _BasicsStepState extends ConsumerState<_BasicsStep> {
  late final TextEditingController _nameCtrl;
  bool _showMoreGenders = false;

  @override
  void initState() {
    super.initState();
    final ob = ref.read(onboardingProvider);
    _nameCtrl = TextEditingController(text: ob.name);
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickBirthday() async {
    final now = DateTime.now();
    final initial =
        ref.read(onboardingProvider).birthday ?? DateTime(now.year - 25);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1920),
      lastDate: DateTime(now.year - 18, now.month, now.day),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: FeelsColors.primary,
              onPrimary: FeelsColors.textPrimary,
              surface: FeelsColors.bgSecondary,
              onSurface: FeelsColors.textPrimary,
            ),
            dialogTheme: DialogThemeData(
              backgroundColor: FeelsColors.bgSecondary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      ref.read(onboardingProvider.notifier).setBirthday(picked);
    }
  }

  String _formatDate(DateTime d) {
    const months = [
      '',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return '${months[d.month]} ${d.day}, ${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final ob = ref.watch(onboardingProvider);

    return _StepScaffold(
      title: 'The basics',
      subtitle: 'Let people know who you are. This info shows on your profile.',
      onBack: () => ref.read(onboardingProvider.notifier).prevStep(),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // --- Name ---
          _FieldLabel('YOUR NAME'),
          const SizedBox(height: FeelsSpacing.s2),
          TextFormField(
            controller: _nameCtrl,
            style: FeelsTypography.body,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              hintText: 'First name',
            ),
            onChanged: (v) {
              ref.read(onboardingProvider.notifier).setName(v);
            },
          ),

          const SizedBox(height: FeelsSpacing.s5),

          // --- Birthday ---
          _FieldLabel('BIRTHDAY'),
          const SizedBox(height: FeelsSpacing.s2),
          GestureDetector(
            onTap: _pickBirthday,
            child: Container(
              width: double.infinity,
              height: FeelsLayout.inputHeight,
              padding: const EdgeInsets.symmetric(
                horizontal: FeelsLayout.inputPadding,
              ),
              decoration: BoxDecoration(
                color: FeelsColors.bgTertiary,
                borderRadius: FeelsRadius.mdAll,
                border: Border.all(color: FeelsColors.border),
              ),
              alignment: Alignment.centerLeft,
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      ob.birthday != null
                          ? _formatDate(ob.birthday!)
                          : 'Select your birthday',
                      style: FeelsTypography.body.copyWith(
                        color: ob.birthday != null
                            ? FeelsColors.textPrimary
                            : FeelsColors.textTertiary,
                      ),
                    ),
                  ),
                  const Icon(
                    Icons.calendar_today_outlined,
                    size: 18,
                    color: FeelsColors.textTertiary,
                  ),
                ],
              ),
            ),
          ),
          if (ob.birthday != null && ob.age != null)
            Padding(
              padding: const EdgeInsets.only(top: FeelsSpacing.s1),
              child: Text(
                'You\'re ${ob.age} years old',
                style: FeelsTypography.bodySmall.copyWith(
                  color: FeelsColors.textTertiary,
                ),
              ),
            ),

          const SizedBox(height: FeelsSpacing.s5),

          // --- Gender ---
          _FieldLabel('GENDER'),
          const SizedBox(height: FeelsSpacing.s2),
          Wrap(
            spacing: FeelsSpacing.s2,
            runSpacing: FeelsSpacing.s2,
            children: _primaryGenders.map((g) {
              return _GenderChip(
                label: g,
                isSelected: ob.gender == g,
                onTap: () {
                  ref.read(onboardingProvider.notifier).setGender(
                        ob.gender == g ? null : g,
                      );
                },
              );
            }).toList(),
          ),

          const SizedBox(height: FeelsSpacing.s2),

          // More options toggle
          GestureDetector(
            onTap: () => setState(() => _showMoreGenders = !_showMoreGenders),
            child: Row(
              children: [
                Text(
                  _showMoreGenders ? 'Fewer options' : 'More options',
                  style: FeelsTypography.bodySmall.copyWith(
                    color: FeelsColors.primary,
                    fontWeight: FeelsTypography.weightHeading,
                  ),
                ),
                const SizedBox(width: FeelsSpacing.s1),
                Icon(
                  _showMoreGenders
                      ? Icons.expand_less
                      : Icons.expand_more,
                  size: 18,
                  color: FeelsColors.primary,
                ),
              ],
            ),
          ),

          if (_showMoreGenders) ...[
            const SizedBox(height: FeelsSpacing.s2),
            Wrap(
              spacing: FeelsSpacing.s2,
              runSpacing: FeelsSpacing.s2,
              children: _expandedGenders.map((g) {
                return _GenderChip(
                  label: g,
                  isSelected: ob.gender == g,
                  onTap: () {
                    ref.read(onboardingProvider.notifier).setGender(
                          ob.gender == g ? null : g,
                        );
                  },
                );
              }).toList(),
            ),
          ],
        ],
      ),
      bottomAction: _PrimaryButton(
        label: 'Continue',
        enabled: ob.isStep1Valid,
        onPressed: () {
          ref.read(onboardingProvider.notifier).nextStep();
        },
      ),
    );
  }
}

// ===========================================================================
// STEP 3: Personality
// ===========================================================================

class _PersonalityStep extends ConsumerStatefulWidget {
  const _PersonalityStep();

  @override
  ConsumerState<_PersonalityStep> createState() => _PersonalityStepState();
}

class _PersonalityStepState extends ConsumerState<_PersonalityStep> {
  late final TextEditingController _bioCtrl;
  late final TextEditingController _promptAnswerCtrl;

  @override
  void initState() {
    super.initState();
    final ob = ref.read(onboardingProvider);
    _bioCtrl = TextEditingController(text: ob.bio);
    _promptAnswerCtrl = TextEditingController(text: ob.promptAnswer);
    // Default prompt question
    if (ob.promptQuestion == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref
            .read(onboardingProvider.notifier)
            .setPromptQuestion(_promptQuestions.first);
      });
    }
  }

  @override
  void dispose() {
    _bioCtrl.dispose();
    _promptAnswerCtrl.dispose();
    super.dispose();
  }

  void _showQuestionPicker() {
    final currentQ = ref.read(onboardingProvider).promptQuestion;
    showModalBottomSheet(
      context: context,
      backgroundColor: FeelsColors.bgSecondary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(FeelsRadius.xl),
        ),
      ),
      builder: (ctx) {
        return SafeArea(
          child: ListView.builder(
            shrinkWrap: true,
            padding: const EdgeInsets.symmetric(vertical: FeelsSpacing.s4),
            itemCount: _promptQuestions.length,
            itemBuilder: (_, i) {
              final q = _promptQuestions[i];
              final isSelected = currentQ == q;
              return ListTile(
                title: Text(
                  q,
                  style: FeelsTypography.body.copyWith(
                    color: isSelected
                        ? FeelsColors.primary
                        : FeelsColors.textPrimary,
                  ),
                ),
                trailing: isSelected
                    ? const Icon(Icons.check, color: FeelsColors.primary)
                    : null,
                onTap: () {
                  ref
                      .read(onboardingProvider.notifier)
                      .setPromptQuestion(q);
                  Navigator.pop(ctx);
                },
              );
            },
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final ob = ref.watch(onboardingProvider);

    return _StepScaffold(
      title: 'Show your personality',
      subtitle: 'Give people a reason to start a conversation with you.',
      onBack: () => ref.read(onboardingProvider.notifier).prevStep(),
      onSkip: () => ref.read(onboardingProvider.notifier).nextStep(),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // --- Bio ---
          _FieldLabel('ABOUT YOU'),
          const SizedBox(height: FeelsSpacing.s2),
          TextFormField(
            controller: _bioCtrl,
            style: FeelsTypography.body,
            maxLines: 4,
            maxLength: 500,
            decoration: const InputDecoration(
              hintText: 'What makes you, you? Share what you love, what you\'re about...',
              counterStyle: TextStyle(color: FeelsColors.textTertiary),
            ),
            onChanged: (v) {
              ref.read(onboardingProvider.notifier).setBio(v);
            },
          ),

          const SizedBox(height: FeelsSpacing.s5),

          // --- Prompt ---
          _FieldLabel('PROMPT'),
          const SizedBox(height: FeelsSpacing.s2),
          Container(
            padding: const EdgeInsets.all(FeelsLayout.cardPadding),
            decoration: BoxDecoration(
              color: FeelsColors.bgSecondary,
              borderRadius: FeelsRadius.lgAll,
              border: Border.all(color: FeelsColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Question selector
                GestureDetector(
                  onTap: _showQuestionPicker,
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          ob.promptQuestion ?? _promptQuestions.first,
                          style: FeelsTypography.bodySmall.copyWith(
                            color: FeelsColors.primary,
                            fontWeight: FeelsTypography.weightHeading,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.swap_horiz,
                        size: 18,
                        color: FeelsColors.textTertiary,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: FeelsSpacing.s2),
                TextFormField(
                  controller: _promptAnswerCtrl,
                  style: FeelsTypography.body,
                  maxLines: 3,
                  maxLength: 200,
                  decoration: const InputDecoration(
                    hintText: 'Your answer...',
                    filled: false,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                    counterStyle:
                        TextStyle(color: FeelsColors.textTertiary),
                  ),
                  onChanged: (v) {
                    ref.read(onboardingProvider.notifier).setPromptAnswer(v);
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: FeelsSpacing.s3),

          // Tip
          Container(
            padding: const EdgeInsets.all(FeelsSpacing.s3),
            decoration: BoxDecoration(
              color: FeelsColors.tertiaryMuted,
              borderRadius: FeelsRadius.mdAll,
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.lightbulb_outline,
                  size: 18,
                  color: FeelsColors.tertiary,
                ),
                const SizedBox(width: FeelsSpacing.s2),
                Expanded(
                  child: Text(
                    'Profiles with prompts get 3x more conversations',
                    style: FeelsTypography.bodySmall.copyWith(
                      color: FeelsColors.tertiary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomAction: _PrimaryButton(
        label: 'Continue',
        enabled: ob.isStep2Valid,
        onPressed: () {
          ref.read(onboardingProvider.notifier).nextStep();
        },
      ),
    );
  }
}

// ===========================================================================
// STEP 4: Preferences
// ===========================================================================

class _PreferencesStep extends ConsumerWidget {
  const _PreferencesStep();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ob = ref.watch(onboardingProvider);

    return _StepScaffold(
      title: 'Who are you looking for?',
      subtitle:
          'Set your preferences. You can always change these later.',
      onBack: () => ref.read(onboardingProvider.notifier).prevStep(),
      content: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // --- Gender preferences ---
          _FieldLabel('SHOW ME'),
          const SizedBox(height: FeelsSpacing.s3),
          ..._allGenderOptions.map((gender) {
            final isChecked = ob.gendersSeeking.contains(gender);
            return _CheckboxRow(
              label: gender,
              value: isChecked,
              onChanged: (_) {
                ref
                    .read(onboardingProvider.notifier)
                    .toggleGenderSeeking(gender);
              },
            );
          }),

          const SizedBox(height: FeelsSpacing.s6),

          // --- Age range ---
          _SectionLabel(
            'AGE RANGE',
            trailing: '${ob.ageMin.round()} - ${ob.ageMax.round()}',
          ),
          const SizedBox(height: FeelsSpacing.s3),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: FeelsColors.primary,
              inactiveTrackColor: FeelsColors.bgTertiary,
              thumbColor: FeelsColors.primary,
              overlayColor: FeelsColors.primaryMuted,
              rangeThumbShape: const RoundRangeSliderThumbShape(
                enabledThumbRadius: 10,
              ),
              trackHeight: 4,
            ),
            child: RangeSlider(
              values: RangeValues(ob.ageMin, ob.ageMax),
              min: 18,
              max: 99,
              divisions: 81,
              labels: RangeLabels(
                ob.ageMin.round().toString(),
                ob.ageMax.round().toString(),
              ),
              onChanged: (values) {
                ref
                    .read(onboardingProvider.notifier)
                    .setAgeRange(values.start, values.end);
              },
            ),
          ),

          const SizedBox(height: FeelsSpacing.s6),

          // --- Distance ---
          _SectionLabel(
            'MAXIMUM DISTANCE',
            trailing: '${ob.distanceMiles.round()} mi',
          ),
          const SizedBox(height: FeelsSpacing.s3),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: FeelsColors.primary,
              inactiveTrackColor: FeelsColors.bgTertiary,
              thumbColor: FeelsColors.primary,
              overlayColor: FeelsColors.primaryMuted,
              trackHeight: 4,
            ),
            child: Slider(
              value: ob.distanceMiles,
              min: 1,
              max: 100,
              divisions: 99,
              label: '${ob.distanceMiles.round()} mi',
              onChanged: (value) {
                ref.read(onboardingProvider.notifier).setDistance(value);
              },
            ),
          ),
        ],
      ),
      bottomAction: _PrimaryButton(
        label: 'Start matching',
        enabled: ob.isStep3Valid,
        isLoading: ob.isSaving,
        onPressed: () async {
          final success =
              await ref.read(onboardingProvider.notifier).saveProfile();
          if (success && context.mounted) {
            HapticFeedback.mediumImpact();
            // Reload profile so the app has it cached
            ref.read(profileProvider.notifier).loadProfile(forceRefresh: true);
            context.go('/home/feed');
          } else if (context.mounted && ob.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(ob.error!)),
            );
          }
        },
      ),
    );
  }
}

// ===========================================================================
// Shared Widgets
// ===========================================================================

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: FeelsTypography.caption.copyWith(
        letterSpacing: FeelsTypography.letterSpacingWide,
      ),
    );
  }
}

class _GenderChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _GenderChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: FeelsSpacing.s4,
          vertical: FeelsSpacing.s3,
        ),
        decoration: BoxDecoration(
          color: isSelected ? FeelsColors.primaryMuted : FeelsColors.bgTertiary,
          borderRadius: FeelsRadius.fullAll,
          border: Border.all(
            color: isSelected ? FeelsColors.primary : FeelsColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? FeelsColors.primary
                : FeelsColors.textPrimary,
            fontSize: FeelsTypography.sizeBase,
            fontWeight: isSelected
                ? FeelsTypography.weightHeading
                : FeelsTypography.weightNormal,
          ),
        ),
      ),
    );
  }
}

class _CheckboxRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool?> onChanged;

  const _CheckboxRow({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => onChanged(!value),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: FeelsSpacing.s2),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: value ? FeelsColors.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color:
                      value ? FeelsColors.primary : FeelsColors.borderLight,
                  width: 1.5,
                ),
              ),
              child: value
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: FeelsSpacing.s3),
            Text(label, style: FeelsTypography.body),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  final String? trailing;

  const _SectionLabel(this.text, {this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          text,
          style: FeelsTypography.caption.copyWith(
            letterSpacing: FeelsTypography.letterSpacingWide,
          ),
        ),
        if (trailing != null) ...[
          const Spacer(),
          Text(
            trailing!,
            style: FeelsTypography.bodySmall.copyWith(
              color: FeelsColors.textPrimary,
              fontWeight: FeelsTypography.weightHeading,
            ),
          ),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Dashed border painter (duplicated from photo_grid.dart to avoid coupling)
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
