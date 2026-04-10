import 'dart:async';
import 'dart:io' as io;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/theme.dart';
import '../../../../shared/widgets/confirmation_sheet.dart';
import '../../domain/models/message.dart';
import '../../widgets/chat_bubble.dart';
import '../../widgets/typing_indicator.dart';
import '../providers/chat_provider.dart';

class ConversationScreen extends ConsumerStatefulWidget {
  final String matchId;
  final String matchName;

  /// Current user's ID — required to determine message ownership.
  final String currentUserId;

  /// First photo URL for the match (used in empty state).
  final String? matchPhotoUrl;

  /// Called when user taps unmatch/block/report in the options menu.
  final void Function(String action, String matchId)? onAction;

  const ConversationScreen({
    super.key,
    required this.matchId,
    required this.matchName,
    required this.currentUserId,
    this.matchPhotoUrl,
    this.onAction,
  });

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _imagePicker = ImagePicker();

  Timer? _typingDebounce;
  bool _isTypingSent = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _textController.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _textController.removeListener(_onTextChanged);
    _scrollController.dispose();
    _textController.dispose();
    _typingDebounce?.cancel();
    // Send typing stop on leave if we were typing.
    if (_isTypingSent) {
      ref.read(chatRepositoryProvider).sendTyping(
            widget.matchId,
            isTyping: false,
          );
    }
    super.dispose();
  }

  void _onScroll() {
    // Load more messages when scrolling near the top (end of reverse list).
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(conversationProvider(widget.matchId).notifier).loadMore();
    }
  }

  void _onTextChanged() {
    if (_textController.text.isNotEmpty && !_isTypingSent) {
      _isTypingSent = true;
      ref
          .read(chatRepositoryProvider)
          .sendTyping(widget.matchId, isTyping: true);
    }

    _typingDebounce?.cancel();
    _typingDebounce = Timer(const Duration(seconds: 2), () {
      if (_isTypingSent) {
        _isTypingSent = false;
        ref
            .read(chatRepositoryProvider)
            .sendTyping(widget.matchId, isTyping: false);
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    HapticFeedback.lightImpact();

    _textController.clear();
    _typingDebounce?.cancel();
    if (_isTypingSent) {
      _isTypingSent = false;
      ref
          .read(chatRepositoryProvider)
          .sendTyping(widget.matchId, isTyping: false);
    }

    await ref.read(conversationProvider(widget.matchId).notifier).sendMessage(
          senderId: widget.currentUserId,
          content: text,
        );
  }

  Future<void> _pickAndSendImage() async {
    final state = ref.read(conversationProvider(widget.matchId));
    if (!state.imageStatus.bothEnabled) {
      // If only we have enabled, show info. Otherwise prompt to enable.
      if (!state.imageStatus.youEnabled) {
        await ref
            .read(conversationProvider(widget.matchId).notifier)
            .toggleImages(enable: true);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                  'Image sharing enabled! Waiting for them to enable too.'),
              backgroundColor: FeelsColors.bgElevated,
            ),
          );
        }
        return;
      }
      // You enabled but they haven't.
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Waiting for them to enable image sharing.'),
            backgroundColor: FeelsColors.bgElevated,
          ),
        );
      }
      return;
    }

    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 85,
    );
    if (picked == null) return;

    try {
      final url = await ref.read(chatRepositoryProvider).uploadImage(
            widget.matchId,
            io.File(picked.path),
          );
      await ref
          .read(conversationProvider(widget.matchId).notifier)
          .sendMessage(
            senderId: widget.currentUserId,
            imageUrl: url,
          );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send image: ${e.toString()}'),
            backgroundColor: FeelsColors.error,
          ),
        );
      }
    }
  }

  void _showOptionsMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: FeelsColors.bgSecondary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(FeelsRadius.xl),
        ),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: FeelsColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              _OptionTile(
                icon: Icons.heart_broken_outlined,
                label: 'Unmatch',
                color: FeelsColors.textSecondary,
                onTap: () {
                  Navigator.pop(context);
                  _showUnmatchConfirmation();
                },
              ),
              _OptionTile(
                icon: Icons.block,
                label: 'Block',
                color: FeelsColors.warning,
                onTap: () {
                  Navigator.pop(context);
                  _showBlockConfirmation();
                },
              ),
              _OptionTile(
                icon: Icons.flag_outlined,
                label: 'Report',
                color: FeelsColors.error,
                onTap: () {
                  Navigator.pop(context);
                  _showReportFlow();
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  void _showUnmatchConfirmation() {
    showConfirmationSheet(
      context,
      icon: Icons.heart_broken,
      iconColor: FeelsColors.primary,
      title: 'Unmatch with ${widget.matchName}?',
      body:
          "You'll lose this conversation and won't see each other again.",
      confirmLabel: 'Unmatch',
      confirmColor: FeelsColors.error,
      cancelLabel: 'Keep Match',
      onConfirm: () => widget.onAction?.call('unmatch', widget.matchId),
    );
  }

  void _showBlockConfirmation() {
    showConfirmationSheet(
      context,
      icon: Icons.block,
      iconColor: FeelsColors.warning,
      title: 'Block ${widget.matchName}?',
      body:
          "They won't be able to see your profile or contact you. You can unblock from settings.",
      confirmLabel: 'Block',
      confirmColor: FeelsColors.error,
      cancelLabel: 'Cancel',
      onConfirm: () => widget.onAction?.call('block', widget.matchId),
    );
  }

  void _showReportFlow() {
    showReportSheet(
      context,
      name: widget.matchName,
      onSubmit: (reason, details) {
        widget.onAction?.call('report', widget.matchId);
      },
    );
  }

  /// Populate the text input with a conversation starter.
  void _useStarter(String text) {
    _textController.text = text;
    _textController.selection = TextSelection.fromPosition(
      TextPosition(offset: text.length),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(conversationProvider(widget.matchId));
    final typingState = ref.watch(typingProvider(widget.matchId));

    return Scaffold(
      backgroundColor: FeelsColors.bgPrimary,
      appBar: AppBar(
        backgroundColor: FeelsColors.bgPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: FeelsColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Row(
          children: [
            // Small avatar in header
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: FeelsColors.bgTertiary,
                image: widget.matchPhotoUrl != null
                    ? DecorationImage(
                        image: NetworkImage(widget.matchPhotoUrl!),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: widget.matchPhotoUrl == null
                  ? const Icon(
                      Icons.person,
                      size: 18,
                      color: FeelsColors.textTertiary,
                    )
                  : null,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                widget.matchName,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: FeelsColors.textPrimary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(
              Icons.more_vert,
              color: FeelsColors.textSecondary,
            ),
            onPressed: _showOptionsMenu,
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages list
          Expanded(
            child: _buildMessagesList(state, typingState),
          ),
          // Input bar
          _buildInputBar(state.imageStatus),
        ],
      ),
    );
  }

  Widget _buildMessagesList(
      ConversationState state, TypingState typingState) {
    if (state.isLoading && state.messages.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: FeelsColors.primary),
      );
    }

    if (state.messages.isEmpty) {
      return _buildEmptyConversation();
    }

    return ListView.builder(
      controller: _scrollController,
      reverse: true,
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: state.messages.length +
          (typingState.isOtherTyping ? 1 : 0) +
          (state.isLoadingMore ? 1 : 0),
      itemBuilder: (context, index) {
        // Typing indicator at the very top (index 0 in reverse).
        if (typingState.isOtherTyping && index == 0) {
          return const Padding(
            padding: EdgeInsets.only(left: 12, top: 4, bottom: 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: TypingIndicator(),
            ),
          );
        }

        final messageIndex =
            typingState.isOtherTyping ? index - 1 : index;

        // Loading spinner at the end (oldest messages).
        if (state.isLoadingMore &&
            messageIndex == state.messages.length) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: FeelsColors.primary,
                ),
              ),
            ),
          );
        }

        if (messageIndex < 0 || messageIndex >= state.messages.length) {
          return const SizedBox.shrink();
        }

        final message = state.messages[messageIndex];
        final isMine = message.senderId == widget.currentUserId;

        return ChatBubble(
          message: message,
          isMine: isMine,
          onRetry: message.status == MessageStatus.failed
              ? () => ref
                  .read(conversationProvider(widget.matchId).notifier)
                  .retrySend(message.id)
              : null,
        );
      },
    );
  }

  Widget _buildEmptyConversation() {
    final starters = [
      'Hey ${widget.matchName}!',
      'What\'s your favorite...',
      'Love your profile!',
    ];

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Match photo avatar
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: FeelsColors.bgTertiary,
                image: widget.matchPhotoUrl != null
                    ? DecorationImage(
                        image: NetworkImage(widget.matchPhotoUrl!),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: widget.matchPhotoUrl == null
                  ? const Icon(
                      Icons.person,
                      color: FeelsColors.textTertiary,
                      size: 28,
                    )
                  : null,
            ),
            const SizedBox(height: FeelsSpacing.s4),

            // Title
            Text(
              'You matched with ${widget.matchName}!',
              textAlign: TextAlign.center,
              style: FeelsTypography.title.copyWith(
                color: FeelsColors.primary,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s2),

            // Subtitle
            Text(
              'Send a message to start the conversation',
              textAlign: TextAlign.center,
              style: FeelsTypography.body.copyWith(
                color: FeelsColors.textSecondary,
              ),
            ),
            const SizedBox(height: FeelsSpacing.s5),

            // Conversation starter chips
            Wrap(
              spacing: FeelsSpacing.s2,
              runSpacing: FeelsSpacing.s2,
              alignment: WrapAlignment.center,
              children: starters.map((text) {
                return GestureDetector(
                  onTap: () => _useStarter(text),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: FeelsSpacing.s4,
                      vertical: FeelsSpacing.s2,
                    ),
                    decoration: BoxDecoration(
                      color: FeelsColors.bgTertiary,
                      borderRadius: FeelsRadius.fullAll,
                      border: Border.all(color: FeelsColors.border),
                    ),
                    child: Text(
                      text,
                      style: FeelsTypography.bodySmall.copyWith(
                        color: FeelsColors.textPrimary,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputBar(ImageStatus imageStatus) {
    // Camera icon color based on image sharing state.
    Color cameraColor;
    if (imageStatus.bothEnabled) {
      cameraColor = FeelsColors.success; // green #4ADE80
    } else if (imageStatus.youEnabled) {
      cameraColor = FeelsColors.secondary; // amber #F5A623
    } else {
      cameraColor = FeelsColors.textDisabled; // grayed out #505050
    }

    return Container(
      padding: EdgeInsets.only(
        left: 8,
        right: 8,
        top: 8,
        bottom: MediaQuery.of(context).viewPadding.bottom + 8,
      ),
      decoration: const BoxDecoration(
        color: FeelsColors.bgSecondary,
        border: Border(
          top: BorderSide(color: FeelsColors.border, width: 0.5),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Camera button — pinned to bottom
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: GestureDetector(
              onTap: _pickAndSendImage,
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: FeelsColors.bgTertiary,
                  borderRadius: BorderRadius.circular(FeelsRadius.md),
                ),
                child: Icon(
                  Icons.camera_alt_outlined,
                  color: cameraColor,
                  size: 22,
                ),
              ),
            ),
          ),

          const SizedBox(width: 8),

          // Text input — grows vertically up to 4 lines
          Expanded(
            child: Container(
              constraints: const BoxConstraints(
                minHeight: 48,
              ),
              decoration: BoxDecoration(
                color: FeelsColors.bgTertiary,
                borderRadius: BorderRadius.circular(FeelsRadius.md),
              ),
              child: TextField(
                controller: _textController,
                style: const TextStyle(
                  fontSize: 15,
                  color: FeelsColors.textPrimary,
                ),
                decoration: const InputDecoration(
                  hintText: 'Type a message...',
                  hintStyle: TextStyle(
                    color: FeelsColors.textTertiary,
                    fontSize: 15,
                  ),
                  border: InputBorder.none,
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
                textInputAction: TextInputAction.newline,
                onSubmitted: (_) => _sendMessage(),
                minLines: 1,
                maxLines: 4,
              ),
            ),
          ),

          const SizedBox(width: 8),

          // Send button — pinned to bottom
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: GestureDetector(
              onTap: _sendMessage,
              child: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: FeelsColors.primary,
                  borderRadius: BorderRadius.circular(FeelsRadius.md),
                ),
                child: const Icon(
                  Icons.send,
                  color: FeelsColors.textPrimary,
                  size: 22,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Options menu tile
// ---------------------------------------------------------------------------

class _OptionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _OptionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color, size: 24),
      title: Text(
        label,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
      onTap: onTap,
    );
  }
}
