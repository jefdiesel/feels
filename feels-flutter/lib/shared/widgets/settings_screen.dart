import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api/api_client.dart';
import '../../core/api/endpoints.dart';
import '../../core/theme/theme.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/premium/data/referral_api.dart';
import '../../features/premium/presentation/providers/subscription_provider.dart';

/// Settings screen with account, notifications, privacy, referral, and actions.
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  // Notification settings
  bool _pushEnabled = true;
  bool _newMatches = true;
  bool _newMessages = true;
  bool _likesReceived = true;
  bool _promotions = false;

  // Privacy settings
  bool _showOnlineStatus = true;
  bool _showReadReceipts = true;
  bool _showDistance = true;
  bool _hideAge = false;
  bool _incognitoMode = false;

  bool _loading = true;
  String? _referralCode;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final dio = ref.read(apiClientProvider);
      final results = await Future.wait([
        dio.get(Endpoints.settingsNotifications),
        dio.get(Endpoints.settingsPrivacy),
      ]);

      final notif = results[0].data as Map<String, dynamic>;
      final privacy = results[1].data as Map<String, dynamic>;

      if (!mounted) return;

      setState(() {
        _pushEnabled = notif['push_enabled'] as bool? ?? true;
        _newMatches = notif['new_matches'] as bool? ?? true;
        _newMessages = notif['new_messages'] as bool? ?? true;
        _likesReceived = notif['likes_received'] as bool? ?? true;
        _promotions = notif['promotions'] as bool? ?? false;

        _showOnlineStatus = privacy['show_online_status'] as bool? ?? true;
        _showReadReceipts = privacy['show_read_receipts'] as bool? ?? true;
        _showDistance = privacy['show_distance'] as bool? ?? true;
        _hideAge = privacy['hide_age'] as bool? ?? false;
        _incognitoMode = privacy['incognito_mode'] as bool? ?? false;

        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }

    // Load referral code.
    try {
      final referralApi = ref.read(referralApiProvider);
      final code = await referralApi.getCode();
      if (mounted) setState(() => _referralCode = code.code);
    } catch (_) {
      // Referral may not be available for all users.
    }
  }

  Future<void> _updateNotification(String key, bool value) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.put(Endpoints.settingsNotifications, data: {key: value});
    } catch (_) {
      // Revert on failure would require storing previous state — keep simple.
    }
  }

  Future<void> _updatePrivacy(String key, bool value) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.put(Endpoints.settingsPrivacy, data: {key: value});
    } catch (_) {
      // Silent failure — toggle stays in new position optimistically.
    }
  }

  @override
  Widget build(BuildContext context) {
    final isPremium = ref.watch(isPremiumProvider);
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: FeelsColors.bgPrimary,
        title: const Text('Settings'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: EdgeInsets.only(bottom: bottomPadding + FeelsSpacing.s7),
              children: [
                // -------------------------------------------------------
                // Account
                // -------------------------------------------------------
                _SectionHeader(title: 'ACCOUNT'),
                _InfoTile(label: 'Email', value: 'Tap to update'),
                _InfoTile(label: 'Phone', value: 'Tap to add'),

                // -------------------------------------------------------
                // Notifications
                // -------------------------------------------------------
                _SectionHeader(title: 'NOTIFICATIONS'),
                _ToggleTile(
                  label: 'Push notifications',
                  value: _pushEnabled,
                  onChanged: (v) {
                    setState(() => _pushEnabled = v);
                    _updateNotification('push_enabled', v);
                  },
                ),
                _ToggleTile(
                  label: 'New matches',
                  value: _newMatches,
                  onChanged: (v) {
                    setState(() => _newMatches = v);
                    _updateNotification('new_matches', v);
                  },
                ),
                _ToggleTile(
                  label: 'New messages',
                  value: _newMessages,
                  onChanged: (v) {
                    setState(() => _newMessages = v);
                    _updateNotification('new_messages', v);
                  },
                ),
                _ToggleTile(
                  label: 'Likes received',
                  value: _likesReceived,
                  onChanged: (v) {
                    setState(() => _likesReceived = v);
                    _updateNotification('likes_received', v);
                  },
                ),
                _ToggleTile(
                  label: 'Promotions',
                  value: _promotions,
                  onChanged: (v) {
                    setState(() => _promotions = v);
                    _updateNotification('promotions', v);
                  },
                ),

                // -------------------------------------------------------
                // Privacy
                // -------------------------------------------------------
                _SectionHeader(title: 'PRIVACY'),
                _ToggleTile(
                  label: 'Online status',
                  value: _showOnlineStatus,
                  onChanged: (v) {
                    setState(() => _showOnlineStatus = v);
                    _updatePrivacy('show_online_status', v);
                  },
                ),
                _ToggleTile(
                  label: 'Read receipts',
                  value: _showReadReceipts,
                  onChanged: (v) {
                    setState(() => _showReadReceipts = v);
                    _updatePrivacy('show_read_receipts', v);
                  },
                ),
                _ToggleTile(
                  label: 'Show distance',
                  value: _showDistance,
                  onChanged: (v) {
                    setState(() => _showDistance = v);
                    _updatePrivacy('show_distance', v);
                  },
                ),
                _ToggleTile(
                  label: 'Hide age',
                  value: _hideAge,
                  onChanged: (v) {
                    setState(() => _hideAge = v);
                    _updatePrivacy('hide_age', v);
                  },
                ),
                _ToggleTile(
                  label: 'Incognito mode',
                  subtitle: 'Only visible to people you like',
                  value: _incognitoMode,
                  onChanged: (v) {
                    setState(() => _incognitoMode = v);
                    _updatePrivacy('incognito_mode', v);
                  },
                  isPremiumFeature: !isPremium,
                ),

                // -------------------------------------------------------
                // Referral
                // -------------------------------------------------------
                if (_referralCode != null) ...[
                  _SectionHeader(title: 'REFERRAL'),
                  _ReferralTile(code: _referralCode!),
                ],

                // -------------------------------------------------------
                // Premium
                // -------------------------------------------------------
                if (!isPremium) ...[
                  const SizedBox(height: FeelsSpacing.s5),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: FeelsLayout.screenPaddingHorizontal,
                    ),
                    child: ElevatedButton(
                      onPressed: () => context.push('/premium'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: FeelsColors.primary,
                        minimumSize: const Size(
                          double.infinity,
                          FeelsLayout.buttonHeight,
                        ),
                      ),
                      child: const Text('Get Premium'),
                    ),
                  ),
                ],

                // -------------------------------------------------------
                // Actions
                // -------------------------------------------------------
                const SizedBox(height: FeelsSpacing.s6),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: FeelsLayout.screenPaddingHorizontal,
                  ),
                  child: OutlinedButton(
                    onPressed: _handleLogout,
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(
                        double.infinity,
                        FeelsLayout.buttonHeight,
                      ),
                    ),
                    child: const Text('Log Out'),
                  ),
                ),
                const SizedBox(height: FeelsSpacing.s3),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: FeelsLayout.screenPaddingHorizontal,
                  ),
                  child: TextButton(
                    onPressed: _handleDeleteAccount,
                    style: TextButton.styleFrom(
                      foregroundColor: FeelsColors.error,
                      minimumSize: const Size(
                        double.infinity,
                        FeelsLayout.buttonHeight,
                      ),
                    ),
                    child: const Text('Delete Account'),
                  ),
                ),

                // -------------------------------------------------------
                // Version
                // -------------------------------------------------------
                const SizedBox(height: FeelsSpacing.s6),
                Center(
                  child: Text(
                    'feels v1.0.0',
                    style: FeelsTypography.caption.copyWith(
                      color: FeelsColors.textTertiary,
                    ),
                  ),
                ),
                const SizedBox(height: FeelsSpacing.s2),
              ],
            ),
    );
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out of feels?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;
    await ref.read(authProvider.notifier).logout();
  }

  Future<void> _handleDeleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => _DeleteAccountDialog(),
    );

    if (confirmed != true || !mounted) return;
    await ref.read(authProvider.notifier).deleteAccount();
  }
}

// ---------------------------------------------------------------------------
// Delete account confirmation dialog
// ---------------------------------------------------------------------------

class _DeleteAccountDialog extends StatefulWidget {
  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _controller = TextEditingController();
  bool _isDeleteEnabled = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final enabled = _controller.text.trim() == 'DELETE';
      if (enabled != _isDeleteEnabled) {
        setState(() => _isDeleteEnabled = enabled);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Delete your account?'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'This is permanent. All your matches, messages, and profile data will be deleted forever.',
          ),
          const SizedBox(height: FeelsSpacing.s4),
          TextField(
            controller: _controller,
            autocorrect: false,
            decoration: const InputDecoration(
              hintText: 'Type DELETE to confirm',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Keep My Account'),
        ),
        TextButton(
          onPressed: _isDeleteEnabled
              ? () => Navigator.of(context).pop(true)
              : null,
          style: TextButton.styleFrom(
            foregroundColor: FeelsColors.error,
            disabledForegroundColor: FeelsColors.error.withValues(alpha: 0.3),
          ),
          child: const Text('Delete My Account'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  final String title;

  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        FeelsLayout.screenPaddingHorizontal,
        FeelsSpacing.s5,
        FeelsLayout.screenPaddingHorizontal,
        FeelsSpacing.s2,
      ),
      child: Text(
        title,
        style: FeelsTypography.caption.copyWith(
          letterSpacing: FeelsTypography.letterSpacingWide,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Info tile (non-interactive display)
// ---------------------------------------------------------------------------

class _InfoTile extends StatelessWidget {
  final String label;
  final String value;

  const _InfoTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: FeelsColors.border, width: 0.5),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: FeelsLayout.screenPaddingHorizontal,
        ),
        title: Text(label, style: FeelsTypography.body),
        trailing: Text(
          value,
          style: FeelsTypography.bodySmall,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Toggle tile
// ---------------------------------------------------------------------------

class _ToggleTile extends StatelessWidget {
  final String label;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool isPremiumFeature;

  const _ToggleTile({
    required this.label,
    this.subtitle,
    required this.value,
    required this.onChanged,
    this.isPremiumFeature = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: FeelsColors.border, width: 0.5),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: FeelsLayout.screenPaddingHorizontal,
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(label, style: FeelsTypography.body),
            ),
            if (isPremiumFeature)
              Container(
                margin: const EdgeInsets.only(left: FeelsSpacing.s2),
                padding: const EdgeInsets.symmetric(
                  horizontal: FeelsSpacing.s2,
                  vertical: FeelsSpacing.s1,
                ),
                decoration: BoxDecoration(
                  color: FeelsColors.secondaryMuted,
                  borderRadius: FeelsRadius.smAll,
                ),
                child: Text(
                  'PRO',
                  style: TextStyle(
                    fontSize: FeelsTypography.sizeXs,
                    fontWeight: FeelsTypography.weightHeading,
                    color: FeelsColors.secondary,
                  ),
                ),
              ),
          ],
        ),
        subtitle: subtitle != null
            ? Text(
                subtitle!,
                style: FeelsTypography.bodySmall.copyWith(
                  fontSize: FeelsTypography.sizeXs,
                ),
              )
            : null,
        trailing: Switch.adaptive(
          value: value,
          onChanged: isPremiumFeature
              ? (v) {
                  // Navigate to premium screen if not subscribed.
                  context.push('/premium');
                }
              : onChanged,
          activeTrackColor: FeelsColors.primary,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Referral tile
// ---------------------------------------------------------------------------

class _ReferralTile extends StatelessWidget {
  final String code;

  const _ReferralTile({required this.code});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: FeelsColors.border, width: 0.5),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: FeelsLayout.screenPaddingHorizontal,
          vertical: FeelsSpacing.s2,
        ),
        title: Text('Your referral code', style: FeelsTypography.body),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: FeelsSpacing.s1),
          child: Text(
            code,
            style: FeelsTypography.title.copyWith(
              color: FeelsColors.primary,
              letterSpacing: 2,
            ),
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.copy, size: 20),
              color: FeelsColors.textSecondary,
              onPressed: () {
                Clipboard.setData(ClipboardData(text: code));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Code copied!')),
                );
              },
            ),
            IconButton(
              icon: const Icon(Icons.share, size: 20),
              color: FeelsColors.textSecondary,
              onPressed: () {
                final text = Uri.encodeComponent(
                  'Join me on feels! Use my referral code: $code\nhttps://feelsfun.app',
                );
                launchUrl(Uri.parse('sms:?body=$text'));
              },
            ),
          ],
        ),
      ),
    );
  }
}
