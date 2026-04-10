import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import '../../domain/models/profile_models.dart';
import '../providers/profile_provider.dart';

/// Edit profile screen with form fields for name, bio, prompts, looking_for,
/// and lifestyle tags.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameCtrl;
  late TextEditingController _bioCtrl;
  late TextEditingController _workMoneyCtrl;
  late TextEditingController _workPassionCtrl;

  // Prompt controllers (up to 3)
  final List<_PromptControllers> _promptCtrls = [];

  // Selected tags
  List<String> _lookingFor = [];
  String? _zodiac;
  String? _religion;
  bool? _hasKids;
  String? _wantsKids;
  String? _alcohol;
  String? _weed;

  bool _initialized = false;

  static const _lookingForOptions = [
    'Long-term relationship',
    'Short-term relationship',
    'Casual',
    'Friends',
    'Not sure yet',
  ];

  static const _zodiacOptions = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];

  static const _religionOptions = [
    'Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian',
    'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Other',
  ];

  static const _alcoholOptions = [
    'Never', 'Rarely', 'Sometimes', 'Often',
  ];

  static const _weedOptions = [
    'Never', 'Rarely', 'Sometimes', 'Often',
  ];

  static const _wantsKidsOptions = [
    'Want someday', 'Don\'t want', 'Have and want more',
    'Have and don\'t want more', 'Not sure',
  ];

  static const _promptQuestions = [
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

  @override
  void dispose() {
    _nameCtrl.dispose();
    _bioCtrl.dispose();
    _workMoneyCtrl.dispose();
    _workPassionCtrl.dispose();
    for (final pc in _promptCtrls) {
      pc.dispose();
    }
    super.dispose();
  }

  void _initFromProfile(Profile profile) {
    if (_initialized) return;
    _initialized = true;

    _nameCtrl = TextEditingController(text: profile.name);
    _bioCtrl = TextEditingController(text: profile.bio);
    _workMoneyCtrl = TextEditingController(text: profile.workForMoney ?? '');
    _workPassionCtrl = TextEditingController(text: profile.workForPassion ?? '');

    for (final prompt in profile.prompts) {
      _promptCtrls.add(_PromptControllers(
        question: prompt.question,
        answerCtrl: TextEditingController(text: prompt.answer),
      ));
    }
    // Ensure at least one empty slot so user can add a prompt.
    if (_promptCtrls.length < 3) {
      _promptCtrls.add(_PromptControllers(
        question: _promptQuestions.first,
        answerCtrl: TextEditingController(),
      ));
    }

    _lookingFor = List.from(profile.lookingFor);
    _zodiac = profile.zodiac;
    _religion = profile.religion;
    _hasKids = profile.hasKids;
    _wantsKids = profile.wantsKids;
    _alcohol = profile.alcohol;
    _weed = profile.weed;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    final prompts = _promptCtrls
        .where((pc) => pc.answerCtrl.text.trim().isNotEmpty)
        .map((pc) => {
              'question': pc.question,
              'answer': pc.answerCtrl.text.trim(),
            })
        .toList();

    final data = <String, dynamic>{
      'name': _nameCtrl.text.trim(),
      'bio': _bioCtrl.text.trim(),
      'prompts': prompts,
      'looking_for': _lookingFor,
      if (_zodiac != null) 'zodiac': _zodiac,
      if (_religion != null) 'religion': _religion,
      if (_hasKids != null) 'has_kids': _hasKids,
      if (_wantsKids != null) 'wants_kids': _wantsKids,
      if (_alcohol != null) 'alcohol': _alcohol,
      if (_weed != null) 'weed': _weed,
      if (_workMoneyCtrl.text.trim().isNotEmpty)
        'work_for_money': _workMoneyCtrl.text.trim(),
      if (_workPassionCtrl.text.trim().isNotEmpty)
        'work_for_passion': _workPassionCtrl.text.trim(),
    };

    await ref.read(profileProvider.notifier).updateProfile(data);

    if (mounted) {
      final error = ref.read(profileProvider).error;
      if (error == null) {
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ps = ref.watch(profileProvider);

    if (!ps.hasProfile) {
      return Scaffold(
        backgroundColor: FeelsColors.bgPrimary,
        appBar: AppBar(title: const Text('Edit Profile')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    _initFromProfile(ps.profile!);

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(
        title: const Text('Edit Profile'),
        actions: [
          TextButton(
            onPressed: ps.isSaving ? null : _save,
            child: ps.isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('Save'),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.symmetric(
            horizontal: FeelsLayout.screenPaddingHorizontal,
            vertical: FeelsSpacing.s4,
          ),
          children: [
            // --- Name ---
            _FieldLabel('Name'),
            const SizedBox(height: FeelsSpacing.s2),
            TextFormField(
              controller: _nameCtrl,
              style: FeelsTypography.body,
              decoration: const InputDecoration(hintText: 'Your first name'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Name is required' : null,
            ),

            const SizedBox(height: FeelsSpacing.s5),

            // --- Bio ---
            _FieldLabel('Bio'),
            const SizedBox(height: FeelsSpacing.s2),
            TextFormField(
              controller: _bioCtrl,
              style: FeelsTypography.body,
              maxLines: 4,
              maxLength: 500,
              decoration: const InputDecoration(
                hintText: 'Tell people about yourself...',
                counterStyle: TextStyle(color: FeelsColors.textTertiary),
              ),
            ),

            const SizedBox(height: FeelsSpacing.s5),

            // --- Prompts ---
            _FieldLabel('Prompts'),
            const SizedBox(height: FeelsSpacing.s2),
            ..._buildPromptFields(),

            const SizedBox(height: FeelsSpacing.s5),

            // --- Looking for ---
            _FieldLabel('Looking For'),
            const SizedBox(height: FeelsSpacing.s2),
            _MultiSelectChips(
              options: _lookingForOptions,
              selected: _lookingFor,
              onChanged: (v) => setState(() => _lookingFor = v),
            ),

            const SizedBox(height: FeelsSpacing.s5),

            // --- Work ---
            _FieldLabel('Work for money'),
            const SizedBox(height: FeelsSpacing.s2),
            TextFormField(
              controller: _workMoneyCtrl,
              style: FeelsTypography.body,
              decoration: const InputDecoration(hintText: 'e.g. Software Engineer'),
            ),

            const SizedBox(height: FeelsSpacing.s4),

            _FieldLabel('Work for passion'),
            const SizedBox(height: FeelsSpacing.s2),
            TextFormField(
              controller: _workPassionCtrl,
              style: FeelsTypography.body,
              decoration: const InputDecoration(hintText: 'e.g. Music Producer'),
            ),

            const SizedBox(height: FeelsSpacing.s5),

            // --- Lifestyle ---
            _FieldLabel('Zodiac'),
            const SizedBox(height: FeelsSpacing.s2),
            _SingleSelectChips(
              options: _zodiacOptions,
              selected: _zodiac,
              onChanged: (v) => setState(() => _zodiac = v),
            ),

            const SizedBox(height: FeelsSpacing.s4),

            _FieldLabel('Religion'),
            const SizedBox(height: FeelsSpacing.s2),
            _SingleSelectChips(
              options: _religionOptions,
              selected: _religion,
              onChanged: (v) => setState(() => _religion = v),
            ),

            const SizedBox(height: FeelsSpacing.s4),

            _FieldLabel('Alcohol'),
            const SizedBox(height: FeelsSpacing.s2),
            _SingleSelectChips(
              options: _alcoholOptions,
              selected: _alcohol,
              onChanged: (v) => setState(() => _alcohol = v),
            ),

            const SizedBox(height: FeelsSpacing.s4),

            _FieldLabel('Weed'),
            const SizedBox(height: FeelsSpacing.s2),
            _SingleSelectChips(
              options: _weedOptions,
              selected: _weed,
              onChanged: (v) => setState(() => _weed = v),
            ),

            const SizedBox(height: FeelsSpacing.s4),

            _FieldLabel('Kids'),
            const SizedBox(height: FeelsSpacing.s2),
            _SingleSelectChips(
              options: const ['Has kids', 'No kids'],
              selected: _hasKids == null
                  ? null
                  : (_hasKids! ? 'Has kids' : 'No kids'),
              onChanged: (v) => setState(
                  () => _hasKids = v == null ? null : v == 'Has kids'),
            ),

            const SizedBox(height: FeelsSpacing.s4),

            _FieldLabel('Wants kids'),
            const SizedBox(height: FeelsSpacing.s2),
            _SingleSelectChips(
              options: _wantsKidsOptions,
              selected: _wantsKids,
              onChanged: (v) => setState(() => _wantsKids = v),
            ),

            const SizedBox(height: FeelsSpacing.s7),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildPromptFields() {
    final widgets = <Widget>[];
    for (int i = 0; i < _promptCtrls.length; i++) {
      final pc = _promptCtrls[i];
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: FeelsSpacing.s3),
          child: Container(
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
                  onTap: () => _showQuestionPicker(i),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          pc.question,
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
                  controller: pc.answerCtrl,
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
                ),
                // Delete prompt
                if (_promptCtrls.length > 1)
                  Align(
                    alignment: Alignment.centerRight,
                    child: GestureDetector(
                      onTap: () => setState(() {
                        _promptCtrls[i].dispose();
                        _promptCtrls.removeAt(i);
                      }),
                      child: const Text(
                        'Remove',
                        style: TextStyle(
                          color: FeelsColors.error,
                          fontSize: FeelsTypography.sizeSm,
                          fontWeight: FeelsTypography.weightHeading,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
    }

    // Add prompt button (max 3)
    if (_promptCtrls.length < 3) {
      widgets.add(
        GestureDetector(
          onTap: () {
            setState(() {
              _promptCtrls.add(_PromptControllers(
                question: _promptQuestions.first,
                answerCtrl: TextEditingController(),
              ));
            });
          },
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: FeelsSpacing.s3),
            decoration: BoxDecoration(
              borderRadius: FeelsRadius.lgAll,
              border: Border.all(color: FeelsColors.border),
            ),
            child: const Center(
              child: Text(
                '+ Add Prompt',
                style: TextStyle(
                  color: FeelsColors.primary,
                  fontSize: FeelsTypography.sizeBase,
                  fontWeight: FeelsTypography.weightHeading,
                ),
              ),
            ),
          ),
        ),
      );
    }

    return widgets;
  }

  void _showQuestionPicker(int promptIndex) {
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
              final isSelected = _promptCtrls[promptIndex].question == q;
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
                  setState(() {
                    _promptCtrls[promptIndex] = _PromptControllers(
                      question: q,
                      answerCtrl: _promptCtrls[promptIndex].answerCtrl,
                    );
                  });
                  Navigator.pop(ctx);
                },
              );
            },
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class _PromptControllers {
  final String question;
  final TextEditingController answerCtrl;

  _PromptControllers({required this.question, required this.answerCtrl});

  void dispose() => answerCtrl.dispose();
}

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

// ---------------------------------------------------------------------------
// Multi-select chips (for looking_for)
// ---------------------------------------------------------------------------

class _MultiSelectChips extends StatelessWidget {
  final List<String> options;
  final List<String> selected;
  final ValueChanged<List<String>> onChanged;

  const _MultiSelectChips({
    required this.options,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: FeelsSpacing.s2,
      runSpacing: FeelsSpacing.s2,
      children: options.map((option) {
        final isSelected = selected.contains(option);
        return GestureDetector(
          onTap: () {
            final updated = List<String>.from(selected);
            if (isSelected) {
              updated.remove(option);
            } else {
              updated.add(option);
            }
            onChanged(updated);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: FeelsSpacing.s3,
              vertical: FeelsSpacing.s2,
            ),
            decoration: BoxDecoration(
              color: isSelected
                  ? FeelsColors.primaryMuted
                  : FeelsColors.bgTertiary,
              borderRadius: FeelsRadius.fullAll,
              border: Border.all(
                color: isSelected ? FeelsColors.primary : FeelsColors.border,
              ),
            ),
            child: Text(
              option,
              style: TextStyle(
                color: isSelected
                    ? FeelsColors.primary
                    : FeelsColors.textPrimary,
                fontSize: FeelsTypography.sizeSm,
                fontWeight: isSelected
                    ? FeelsTypography.weightHeading
                    : FeelsTypography.weightNormal,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ---------------------------------------------------------------------------
// Single-select chips (for zodiac, religion, etc.)
// ---------------------------------------------------------------------------

class _SingleSelectChips extends StatelessWidget {
  final List<String> options;
  final String? selected;
  final ValueChanged<String?> onChanged;

  const _SingleSelectChips({
    required this.options,
    this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: FeelsSpacing.s2,
      runSpacing: FeelsSpacing.s2,
      children: options.map((option) {
        final isSelected = selected == option;
        return GestureDetector(
          onTap: () {
            onChanged(isSelected ? null : option);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: FeelsSpacing.s3,
              vertical: FeelsSpacing.s2,
            ),
            decoration: BoxDecoration(
              color: isSelected
                  ? FeelsColors.primaryMuted
                  : FeelsColors.bgTertiary,
              borderRadius: FeelsRadius.fullAll,
              border: Border.all(
                color: isSelected ? FeelsColors.primary : FeelsColors.border,
              ),
            ),
            child: Text(
              option,
              style: TextStyle(
                color: isSelected
                    ? FeelsColors.primary
                    : FeelsColors.textPrimary,
                fontSize: FeelsTypography.sizeSm,
                fontWeight: isSelected
                    ? FeelsTypography.weightHeading
                    : FeelsTypography.weightNormal,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
