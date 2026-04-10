import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/theme.dart';
import '../../domain/models/profile_models.dart';
import '../providers/profile_provider.dart';

/// Preferences screen: gender seeking checkboxes, age range slider,
/// distance slider, private mode toggle.
class PreferencesScreen extends ConsumerStatefulWidget {
  const PreferencesScreen({super.key});

  @override
  ConsumerState<PreferencesScreen> createState() => _PreferencesScreenState();
}

class _PreferencesScreenState extends ConsumerState<PreferencesScreen> {
  late List<String> _gendersSeeking;
  late RangeValues _ageRange;
  late double _distanceMiles;
  late bool _isPrivate;

  bool _initialized = false;
  bool _hasChanges = false;

  static const _genderOptions = [
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

  void _initFromPreferences(Preferences prefs) {
    if (_initialized) return;
    _initialized = true;

    _gendersSeeking = List.from(prefs.gendersSeeking);
    _ageRange = RangeValues(
      prefs.ageMin.toDouble(),
      prefs.ageMax.toDouble(),
    );
    _distanceMiles = prefs.distanceMiles.toDouble();
    _isPrivate = prefs.isPrivate;
  }

  void _markChanged() {
    if (!_hasChanges) setState(() => _hasChanges = true);
  }

  Future<void> _save() async {
    final data = {
      'genders_seeking': _gendersSeeking,
      'age_min': _ageRange.start.round(),
      'age_max': _ageRange.end.round(),
      'distance_miles': _distanceMiles.round(),
      'is_private': _isPrivate,
    };

    await ref.read(profileProvider.notifier).updatePreferences(data);

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

    if (ps.preferences == null) {
      return Scaffold(
        backgroundColor: FeelsColors.bgPrimary,
        appBar: AppBar(title: const Text('Search Filters')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    _initFromPreferences(ps.preferences!);

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(
        title: const Text('Search Filters'),
        actions: [
          TextButton(
            onPressed: (!_hasChanges || ps.isSaving) ? null : _save,
            child: ps.isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    'Save',
                    style: TextStyle(
                      color: _hasChanges
                          ? FeelsColors.primary
                          : FeelsColors.textDisabled,
                    ),
                  ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(
          horizontal: FeelsLayout.screenPaddingHorizontal,
          vertical: FeelsSpacing.s4,
        ),
        children: [
          // --- Gender seeking ---
          _SectionLabel('Show me'),
          const SizedBox(height: FeelsSpacing.s3),
          ..._genderOptions.map((gender) {
            final isChecked = _gendersSeeking.contains(gender);
            return _CheckboxRow(
              label: gender,
              value: isChecked,
              onChanged: (checked) {
                setState(() {
                  if (checked == true) {
                    _gendersSeeking.add(gender);
                  } else {
                    _gendersSeeking.remove(gender);
                  }
                });
                _markChanged();
              },
            );
          }),

          const SizedBox(height: FeelsSpacing.s6),

          // --- Age range ---
          _SectionLabel(
            'Age Range',
            trailing: '${_ageRange.start.round()} - ${_ageRange.end.round()}',
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
              values: _ageRange,
              min: 18,
              max: 99,
              divisions: 81,
              labels: RangeLabels(
                _ageRange.start.round().toString(),
                _ageRange.end.round().toString(),
              ),
              onChanged: (values) {
                setState(() => _ageRange = values);
                _markChanged();
              },
            ),
          ),

          const SizedBox(height: FeelsSpacing.s6),

          // --- Distance ---
          _SectionLabel(
            'Maximum Distance',
            trailing: '${_distanceMiles.round()} mi',
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
              value: _distanceMiles,
              min: 1,
              max: 100,
              divisions: 99,
              label: '${_distanceMiles.round()} mi',
              onChanged: (value) {
                setState(() => _distanceMiles = value);
                _markChanged();
              },
            ),
          ),

          const SizedBox(height: FeelsSpacing.s6),

          // --- Private mode ---
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
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Private Mode',
                            style: FeelsTypography.body.copyWith(
                              fontWeight: FeelsTypography.weightHeading,
                            ),
                          ),
                          const SizedBox(height: FeelsSpacing.s1),
                          Text(
                            'Only people you like can see your profile.',
                            style: FeelsTypography.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _isPrivate,
                      onChanged: (value) {
                        setState(() => _isPrivate = value);
                        _markChanged();
                      },
                    ),
                  ],
                ),
                if (_isPrivate)
                  Padding(
                    padding: const EdgeInsets.only(top: FeelsSpacing.s2),
                    child: Container(
                      padding: const EdgeInsets.all(FeelsSpacing.s3),
                      decoration: BoxDecoration(
                        color: FeelsColors.secondaryMuted,
                        borderRadius: FeelsRadius.mdAll,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.star,
                            size: 16,
                            color: FeelsColors.secondary,
                          ),
                          const SizedBox(width: FeelsSpacing.s2),
                          Expanded(
                            child: Text(
                              'Premium feature',
                              style: FeelsTypography.bodySmall.copyWith(
                                color: FeelsColors.secondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: FeelsSpacing.s7),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Section label
// ---------------------------------------------------------------------------

class _SectionLabel extends StatelessWidget {
  final String text;
  final String? trailing;

  const _SectionLabel(this.text, {this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          text.toUpperCase(),
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
// Checkbox row
// ---------------------------------------------------------------------------

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
                  color: value ? FeelsColors.primary : FeelsColors.borderLight,
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
