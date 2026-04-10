import 'package:flutter/material.dart';

import '../../core/theme/theme.dart';

/// Reusable confirmation bottom sheet with icon, title, body, and two actions.
///
/// Use [showConfirmationSheet] to display it.
class ConfirmationSheet extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String body;
  final String confirmLabel;
  final Color confirmColor;
  final String cancelLabel;
  final VoidCallback onConfirm;

  const ConfirmationSheet({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.body,
    required this.confirmLabel,
    required this.confirmColor,
    this.cancelLabel = 'Cancel',
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          FeelsSpacing.s5,
          FeelsSpacing.s2,
          FeelsSpacing.s5,
          FeelsSpacing.s5,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: FeelsColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: FeelsSpacing.s5),

            // Icon
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: iconColor),
            ),
            const SizedBox(height: FeelsSpacing.s4),

            // Title
            Text(
              title,
              style: FeelsTypography.title,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: FeelsSpacing.s2),

            // Body
            Text(
              body,
              style: FeelsTypography.body.copyWith(
                color: FeelsColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: FeelsSpacing.s5),

            // Confirm button (destructive)
            SizedBox(
              width: double.infinity,
              height: FeelsLayout.buttonHeight,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  onConfirm();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: confirmColor,
                  foregroundColor: FeelsColors.textPrimary,
                  shape: RoundedRectangleBorder(
                    borderRadius: FeelsRadius.mdAll,
                  ),
                ),
                child: Text(
                  confirmLabel,
                  style: const TextStyle(
                    fontSize: FeelsTypography.sizeBase,
                    fontWeight: FeelsTypography.weightHeading,
                  ),
                ),
              ),
            ),
            const SizedBox(height: FeelsSpacing.s3),

            // Cancel button (outlined)
            SizedBox(
              width: double.infinity,
              height: FeelsLayout.buttonHeight,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                child: Text(
                  cancelLabel,
                  style: const TextStyle(
                    fontSize: FeelsTypography.sizeBase,
                    fontWeight: FeelsTypography.weightHeading,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shows a [ConfirmationSheet] as a modal bottom sheet.
Future<void> showConfirmationSheet(
  BuildContext context, {
  required IconData icon,
  required Color iconColor,
  required String title,
  required String body,
  required String confirmLabel,
  required Color confirmColor,
  String cancelLabel = 'Cancel',
  required VoidCallback onConfirm,
}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: FeelsColors.bgSecondary,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(FeelsRadius.xl),
      ),
    ),
    builder: (_) => ConfirmationSheet(
      icon: icon,
      iconColor: iconColor,
      title: title,
      body: body,
      confirmLabel: confirmLabel,
      confirmColor: confirmColor,
      cancelLabel: cancelLabel,
      onConfirm: onConfirm,
    ),
  );
}

// ---------------------------------------------------------------------------
// Report bottom sheet (special case with reason selection)
// ---------------------------------------------------------------------------

/// Shows a report flow bottom sheet with reason chips and optional details.
Future<void> showReportSheet(
  BuildContext context, {
  required String name,
  required void Function(String reason, String details) onSubmit,
}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: FeelsColors.bgSecondary,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(
        top: Radius.circular(FeelsRadius.xl),
      ),
    ),
    builder: (_) => _ReportSheet(name: name, onSubmit: onSubmit),
  );
}

class _ReportSheet extends StatefulWidget {
  final String name;
  final void Function(String reason, String details) onSubmit;

  const _ReportSheet({required this.name, required this.onSubmit});

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  static const _reasons = [
    'Inappropriate photos',
    'Harassment',
    'Spam/Fake',
    'Underage',
    'Other',
  ];

  String? _selectedReason;
  final _detailsController = TextEditingController();

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          FeelsSpacing.s5,
          FeelsSpacing.s2,
          FeelsSpacing.s5,
          MediaQuery.of(context).viewInsets.bottom + FeelsSpacing.s5,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: FeelsColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: FeelsSpacing.s5),

            // Icon
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: FeelsColors.error.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.flag_outlined,
                size: 48,
                color: FeelsColors.error,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s4),

            // Title
            Text(
              'Report ${widget.name}',
              style: FeelsTypography.title,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: FeelsSpacing.s2),

            // Body
            Text(
              'Why are you reporting this person?',
              style: FeelsTypography.body.copyWith(
                color: FeelsColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: FeelsSpacing.s4),

            // Reason chips
            Wrap(
              spacing: FeelsSpacing.s2,
              runSpacing: FeelsSpacing.s2,
              children: _reasons.map((reason) {
                final selected = _selectedReason == reason;
                return ChoiceChip(
                  label: Text(
                    reason,
                    style: TextStyle(
                      fontSize: FeelsTypography.sizeSm,
                      fontWeight: FeelsTypography.weightHeading,
                      color: selected
                          ? FeelsColors.textPrimary
                          : FeelsColors.textSecondary,
                    ),
                  ),
                  selected: selected,
                  onSelected: (val) {
                    setState(() => _selectedReason = val ? reason : null);
                  },
                  selectedColor: FeelsColors.error,
                  backgroundColor: FeelsColors.bgTertiary,
                  side: BorderSide(
                    color: selected ? FeelsColors.error : FeelsColors.border,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: FeelsRadius.smAll,
                  ),
                  showCheckmark: false,
                );
              }).toList(),
            ),

            // Details text field (shown after selecting a reason)
            if (_selectedReason != null) ...[
              const SizedBox(height: FeelsSpacing.s4),
              TextField(
                controller: _detailsController,
                maxLines: 3,
                style: FeelsTypography.body,
                decoration: InputDecoration(
                  hintText: 'Additional details (optional)',
                  hintStyle: TextStyle(
                    color: FeelsColors.textTertiary,
                    fontSize: FeelsTypography.sizeBase,
                  ),
                  filled: true,
                  fillColor: FeelsColors.bgTertiary,
                  border: OutlineInputBorder(
                    borderRadius: FeelsRadius.mdAll,
                    borderSide: const BorderSide(color: FeelsColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: FeelsRadius.mdAll,
                    borderSide: const BorderSide(color: FeelsColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: FeelsRadius.mdAll,
                    borderSide: const BorderSide(
                      color: FeelsColors.borderFocus,
                      width: 2,
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: FeelsSpacing.s5),

            // Submit button
            SizedBox(
              width: double.infinity,
              height: FeelsLayout.buttonHeight,
              child: ElevatedButton(
                onPressed: _selectedReason != null
                    ? () {
                        Navigator.pop(context);
                        widget.onSubmit(
                          _selectedReason!,
                          _detailsController.text.trim(),
                        );
                      }
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: FeelsColors.error,
                  foregroundColor: FeelsColors.textPrimary,
                  disabledBackgroundColor: FeelsColors.bgTertiary,
                  disabledForegroundColor: FeelsColors.textDisabled,
                  shape: RoundedRectangleBorder(
                    borderRadius: FeelsRadius.mdAll,
                  ),
                ),
                child: const Text(
                  'Submit Report',
                  style: TextStyle(
                    fontSize: FeelsTypography.sizeBase,
                    fontWeight: FeelsTypography.weightHeading,
                  ),
                ),
              ),
            ),
            const SizedBox(height: FeelsSpacing.s3),

            // Cancel button
            SizedBox(
              width: double.infinity,
              height: FeelsLayout.buttonHeight,
              child: OutlinedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text(
                  'Cancel',
                  style: TextStyle(
                    fontSize: FeelsTypography.sizeBase,
                    fontWeight: FeelsTypography.weightHeading,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
