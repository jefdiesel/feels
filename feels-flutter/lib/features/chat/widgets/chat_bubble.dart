import 'package:flutter/material.dart';

import '../../../core/theme/theme.dart';
import '../domain/models/message.dart';

/// A single message bubble in the conversation.
class ChatBubble extends StatelessWidget {
  final Message message;
  final bool isMine;
  final VoidCallback? onRetry;

  const ChatBubble({
    super.key,
    required this.message,
    required this.isMine,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final isFailed = message.status == MessageStatus.failed;
    final isSending = message.status == MessageStatus.sending;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Row(
        mainAxisAlignment:
            isMine ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (isMine && isFailed)
            GestureDetector(
              onTap: onRetry,
              child: const Padding(
                padding: EdgeInsets.only(right: 6, bottom: 4),
                child: Icon(
                  Icons.refresh,
                  size: 18,
                  color: FeelsColors.error,
                ),
              ),
            ),
          Flexible(
            child: Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.75,
              ),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isMine ? FeelsColors.primary : const Color(0xFF222222),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(20),
                  topRight: const Radius.circular(20),
                  bottomLeft: Radius.circular(isMine ? 20 : 4),
                  bottomRight: Radius.circular(isMine ? 4 : 20),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Image message
                  if (message.imageUrl != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        message.imageUrl!,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          height: 120,
                          color: FeelsColors.bgTertiary,
                          child: const Center(
                            child: Icon(
                              Icons.broken_image_outlined,
                              color: FeelsColors.textTertiary,
                            ),
                          ),
                        ),
                      ),
                    ),
                    if (message.content != null) const SizedBox(height: 6),
                  ],

                  // Text content
                  if (message.content != null && message.content!.isNotEmpty)
                    Text(
                      message.content!,
                      style: TextStyle(
                        fontSize: 15,
                        color: isMine
                            ? FeelsColors.textPrimary
                            : FeelsColors.textPrimary,
                        height: 1.4,
                      ),
                    ),

                  const SizedBox(height: 2),

                  // Status row
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatTime(message.createdAt),
                        style: TextStyle(
                          fontSize: 10,
                          color: isMine
                              ? FeelsColors.textPrimary.withValues(alpha: 0.6)
                              : FeelsColors.textTertiary,
                        ),
                      ),
                      if (isMine) ...[
                        const SizedBox(width: 4),
                        _buildStatusIcon(message.status, isSending),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIcon(MessageStatus status, bool isSending) {
    if (isSending) {
      return SizedBox(
        width: 12,
        height: 12,
        child: CircularProgressIndicator(
          strokeWidth: 1.5,
          color: FeelsColors.textPrimary.withValues(alpha: 0.6),
        ),
      );
    }

    IconData icon;
    Color color;
    switch (status) {
      case MessageStatus.sent:
        icon = Icons.check;
        color = FeelsColors.textPrimary.withValues(alpha: 0.6);
      case MessageStatus.delivered:
        icon = Icons.done_all;
        color = FeelsColors.textPrimary.withValues(alpha: 0.6);
      case MessageStatus.read:
        icon = Icons.done_all;
        color = FeelsColors.tertiary;
      case MessageStatus.failed:
        icon = Icons.error_outline;
        color = FeelsColors.error;
      default:
        icon = Icons.check;
        color = FeelsColors.textPrimary.withValues(alpha: 0.6);
    }

    return Icon(icon, size: 14, color: color);
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour.toString().padLeft(2, '0');
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}
