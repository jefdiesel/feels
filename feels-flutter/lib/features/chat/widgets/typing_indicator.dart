import 'package:flutter/material.dart';

import '../../../core/theme/theme.dart';

/// Animated three-dot typing indicator.
class TypingIndicator extends StatefulWidget {
  const TypingIndicator({super.key});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: FeelsColors.bgElevated,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(20),
          topRight: const Radius.circular(20),
          bottomLeft: const Radius.circular(4),
          bottomRight: const Radius.circular(20),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: List.generate(3, (index) {
          return AnimatedBuilder(
            listenable: _controller,
            builder: (context, child) {
              // Stagger each dot by 0.2.
              final delay = index * 0.2;
              final t = (_controller.value - delay).clamp(0.0, 1.0);
              // Bounce: 0->0.5 up, 0.5->1.0 down.
              final bounce = t < 0.5 ? t * 2.0 : 2.0 - t * 2.0;
              return Container(
                margin: EdgeInsets.only(right: index < 2 ? 4 : 0),
                child: Transform.translate(
                  offset: Offset(0, -4 * bounce),
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: FeelsColors.textTertiary
                          .withValues(alpha: 0.5 + 0.5 * bounce),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              );
            },
          );
        }),
      ),
    );
  }
}

/// AnimatedBuilder wraps AnimatedWidget pattern using a builder callback.
class AnimatedBuilder extends AnimatedWidget {
  final Widget Function(BuildContext context, Widget? child) builder;

  const AnimatedBuilder({
    super.key,
    required super.listenable,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return builder(context, null);
  }
}
