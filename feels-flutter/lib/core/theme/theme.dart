import 'package:flutter/material.dart';

/// feels Design System
///
/// Dark mode only. Inclusive, warm palette.
/// Coral = action, amber = premium, teal = info.
/// Green = like (not red), gray = pass.

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

class FeelsColors {
  FeelsColors._();

  // Primary - warm coral-rose
  static const Color primary = Color(0xFFE85D75);
  static const Color primaryLight = Color(0xFFFF8B9A);
  static const Color primaryDark = Color(0xFFC44D63);
  static const Color primaryMuted = Color(0x26E85D75); // 15%

  // Secondary - warm amber/gold
  static const Color secondary = Color(0xFFF5A623);
  static const Color secondaryLight = Color(0xFFFFD166);
  static const Color secondaryDark = Color(0xFFD4920F);
  static const Color secondaryMuted = Color(0x26F5A623);

  // Tertiary - soft teal
  static const Color tertiary = Color(0xFF4ECDC4);
  static const Color tertiaryLight = Color(0xFF7EDDD6);
  static const Color tertiaryDark = Color(0xFF3DB8B0);
  static const Color tertiaryMuted = Color(0x264ECDC4);

  // Background scale: base -> card -> elevated -> highest
  static const Color bgPrimary = Color(0xFF0A0A0A);
  static const Color bgSecondary = Color(0xFF141414);
  static const Color bgTertiary = Color(0xFF1E1E1E);
  static const Color bgElevated = Color(0xFF262626);

  // Text hierarchy
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFFA0A0A0);
  static const Color textTertiary = Color(0xFF707070);
  static const Color textDisabled = Color(0xFF505050);

  // Borders
  static const Color border = Color(0xFF2A2A2A);
  static const Color borderLight = Color(0xFF3A3A3A);
  static const Color borderFocus = Color(0xFFE85D75);

  // Semantic
  static const Color success = Color(0xFF4ADE80);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF4ECDC4);

  // Action colors (swipe feedback)
  static const Color like = Color(0xFF4ADE80);
  static const Color pass = Color(0xFF6B7280);
  static const Color premiumLike = Color(0xFFF5A623);
  static const Color superlike = Color(0xFFE85D75);
  static const Color match = Color(0xFFE85D75);

  // Overlay
  static const Color overlay = Color(0xCC000000); // 80%
  static const Color glass = Color(0xD9141414); // 85%
}

// ---------------------------------------------------------------------------
// Spacing - multiples of 4 only
// ---------------------------------------------------------------------------

class FeelsSpacing {
  FeelsSpacing._();

  static const double s0 = 0;
  static const double s1 = 4;
  static const double s2 = 8;
  static const double s3 = 12;
  static const double s4 = 16;
  static const double s5 = 24;
  static const double s6 = 32;
  static const double s7 = 48;
  static const double s8 = 64;
}

// ---------------------------------------------------------------------------
// Border Radius - 5 tokens
// ---------------------------------------------------------------------------

class FeelsRadius {
  FeelsRadius._();

  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double full = 9999;

  static final BorderRadius smAll = BorderRadius.circular(sm);
  static final BorderRadius mdAll = BorderRadius.circular(md);
  static final BorderRadius lgAll = BorderRadius.circular(lg);
  static final BorderRadius xlAll = BorderRadius.circular(xl);
  static final BorderRadius fullAll = BorderRadius.circular(full);
}

// ---------------------------------------------------------------------------
// Typography - 6 sizes, 2 weights
// ---------------------------------------------------------------------------

class FeelsTypography {
  FeelsTypography._();

  static const double sizeXs = 11;
  static const double sizeSm = 13;
  static const double sizeBase = 15;
  static const double sizeTitle = 20;
  static const double sizeH2 = 24;
  static const double sizeH1 = 32;

  static const FontWeight weightNormal = FontWeight.w400;
  static const FontWeight weightHeading = FontWeight.w600;

  static const double lineHeightHeading = 1.2;
  static const double lineHeightBody = 1.5;
  static const double lineHeightCaption = 1.4;

  static const double letterSpacingTight = -0.5;
  static const double letterSpacingNormal = 0;
  static const double letterSpacingWide = 0.8;

  static const TextStyle h1 = TextStyle(
    fontSize: sizeH1,
    fontWeight: weightHeading,
    height: lineHeightHeading,
    letterSpacing: letterSpacingTight,
    color: FeelsColors.textPrimary,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: sizeH2,
    fontWeight: weightHeading,
    height: lineHeightHeading,
    letterSpacing: letterSpacingTight,
    color: FeelsColors.textPrimary,
  );

  static const TextStyle title = TextStyle(
    fontSize: sizeTitle,
    fontWeight: weightHeading,
    height: lineHeightHeading,
    letterSpacing: letterSpacingTight,
    color: FeelsColors.textPrimary,
  );

  static const TextStyle body = TextStyle(
    fontSize: sizeBase,
    fontWeight: weightNormal,
    height: lineHeightBody,
    letterSpacing: letterSpacingNormal,
    color: FeelsColors.textPrimary,
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: sizeSm,
    fontWeight: weightNormal,
    height: lineHeightBody,
    letterSpacing: letterSpacingNormal,
    color: FeelsColors.textSecondary,
  );

  static const TextStyle caption = TextStyle(
    fontSize: sizeXs,
    fontWeight: weightHeading,
    height: lineHeightCaption,
    letterSpacing: letterSpacingWide,
    color: FeelsColors.textSecondary,
  );
}

// ---------------------------------------------------------------------------
// Layout dimensions
// ---------------------------------------------------------------------------

class FeelsLayout {
  FeelsLayout._();

  static const double tabBarHeight = 72;
  static const double tabBarIconSize = 24;
  static const double tabBarPaddingBottom = 20;
  static const double tabBarPaddingTop = 12;
  static const double headerHeight = 56;

  static const double cardBorderRadius = 16;
  static const double cardPadding = 16;

  static const double buttonHeight = 48;
  static const double buttonMinWidth = 48;
  static const double buttonBorderRadius = 12;

  static const double actionButtonSize = 60;
  static const double actionButtonBorderWidth = 2;
  static const double actionButtonIconSize = 24;

  static const double inputHeight = 48;
  static const double inputBorderRadius = 12;
  static const double inputPadding = 16;

  static const double photoHeightPercent = 0.62;
  static const double screenPaddingHorizontal = 20;
}

// ---------------------------------------------------------------------------
// Gradients
// ---------------------------------------------------------------------------

class FeelsGradients {
  FeelsGradients._();

  static const LinearGradient primary = LinearGradient(
    colors: [FeelsColors.primary, FeelsColors.primaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient secondary = LinearGradient(
    colors: [FeelsColors.secondary, FeelsColors.secondaryDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient photoOverlay = LinearGradient(
    colors: [
      Colors.transparent,
      Color(0x66000000), // 40%
      Color(0xF2000000), // 95%
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    stops: [0.0, 0.5, 1.0],
  );

  static const LinearGradient card = LinearGradient(
    colors: [
      Color(0xE61E1E1E), // 90%
      Color(0xF2141414), // 95%
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}

// ---------------------------------------------------------------------------
// ThemeData
// ---------------------------------------------------------------------------

ThemeData feelsTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: FeelsColors.bgPrimary,
    colorScheme: const ColorScheme.dark(
      primary: FeelsColors.primary,
      onPrimary: FeelsColors.textPrimary,
      secondary: FeelsColors.secondary,
      onSecondary: FeelsColors.textPrimary,
      tertiary: FeelsColors.tertiary,
      onTertiary: FeelsColors.textPrimary,
      surface: FeelsColors.bgSecondary,
      onSurface: FeelsColors.textPrimary,
      error: FeelsColors.error,
      onError: FeelsColors.textPrimary,
    ),
    textTheme: const TextTheme(
      headlineLarge: FeelsTypography.h1,
      headlineMedium: FeelsTypography.h2,
      titleLarge: FeelsTypography.title,
      bodyLarge: FeelsTypography.body,
      bodyMedium: FeelsTypography.body,
      bodySmall: FeelsTypography.bodySmall,
      labelSmall: FeelsTypography.caption,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: FeelsColors.bgPrimary,
      foregroundColor: FeelsColors.textPrimary,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: FeelsTypography.title,
      toolbarHeight: FeelsLayout.headerHeight,
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: FeelsColors.bgSecondary,
      selectedItemColor: FeelsColors.primary,
      unselectedItemColor: FeelsColors.textTertiary,
      type: BottomNavigationBarType.fixed,
      showSelectedLabels: true,
      showUnselectedLabels: true,
      selectedLabelStyle: TextStyle(
        fontSize: FeelsTypography.sizeXs,
        fontWeight: FeelsTypography.weightHeading,
        letterSpacing: FeelsTypography.letterSpacingWide,
      ),
      unselectedLabelStyle: TextStyle(
        fontSize: FeelsTypography.sizeXs,
        fontWeight: FeelsTypography.weightNormal,
        letterSpacing: FeelsTypography.letterSpacingWide,
      ),
    ),
    cardTheme: CardThemeData(
      color: FeelsColors.bgSecondary,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: FeelsRadius.lgAll,
      ),
      margin: EdgeInsets.zero,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: FeelsColors.primary,
        foregroundColor: FeelsColors.textPrimary,
        minimumSize: const Size(FeelsLayout.buttonMinWidth, FeelsLayout.buttonHeight),
        shape: RoundedRectangleBorder(
          borderRadius: FeelsRadius.mdAll,
        ),
        textStyle: const TextStyle(
          fontSize: FeelsTypography.sizeBase,
          fontWeight: FeelsTypography.weightHeading,
        ),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: FeelsColors.textPrimary,
        minimumSize: const Size(FeelsLayout.buttonMinWidth, FeelsLayout.buttonHeight),
        shape: RoundedRectangleBorder(
          borderRadius: FeelsRadius.mdAll,
        ),
        side: const BorderSide(color: FeelsColors.border),
        textStyle: const TextStyle(
          fontSize: FeelsTypography.sizeBase,
          fontWeight: FeelsTypography.weightHeading,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: FeelsColors.primary,
        textStyle: const TextStyle(
          fontSize: FeelsTypography.sizeBase,
          fontWeight: FeelsTypography.weightHeading,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: FeelsColors.bgTertiary,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: FeelsLayout.inputPadding,
        vertical: FeelsSpacing.s3,
      ),
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
        borderSide: const BorderSide(color: FeelsColors.borderFocus, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: FeelsRadius.mdAll,
        borderSide: const BorderSide(color: FeelsColors.error),
      ),
      hintStyle: const TextStyle(
        color: FeelsColors.textTertiary,
        fontSize: FeelsTypography.sizeBase,
      ),
      labelStyle: const TextStyle(
        color: FeelsColors.textSecondary,
        fontSize: FeelsTypography.sizeSm,
      ),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: FeelsColors.bgSecondary,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(FeelsRadius.xl),
          topRight: Radius.circular(FeelsRadius.xl),
        ),
      ),
      modalBarrierColor: FeelsColors.overlay,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: FeelsColors.bgSecondary,
      shape: RoundedRectangleBorder(
        borderRadius: FeelsRadius.lgAll,
      ),
      titleTextStyle: FeelsTypography.title,
      contentTextStyle: FeelsTypography.body,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: FeelsColors.bgElevated,
      contentTextStyle: FeelsTypography.body,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: FeelsRadius.mdAll,
      ),
    ),
    dividerTheme: const DividerThemeData(
      color: FeelsColors.border,
      thickness: 1,
      space: 0,
    ),
    iconTheme: const IconThemeData(
      color: FeelsColors.textPrimary,
      size: 24,
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: FeelsColors.primary,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return FeelsColors.primary;
        }
        return FeelsColors.textTertiary;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return FeelsColors.primaryMuted;
        }
        return FeelsColors.bgTertiary;
      }),
    ),
  );
}
