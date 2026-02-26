/**
 * Modern, sophisticated color system for Feels
 *
 * Design principles:
 * - Inclusive and welcoming (not gendered)
 * - High contrast for accessibility
 * - Warm, inviting tones
 * - Clean, minimal aesthetic
 */

export const colors = {
  // Primary brand colors - warm coral/rose gradient
  primary: {
    DEFAULT: '#E85D75',    // Warm coral-rose (main accent)
    light: '#FF8B9A',      // Lighter variant
    dark: '#C44D63',       // Darker variant
    muted: 'rgba(232, 93, 117, 0.15)', // Subtle background
  },

  // Secondary accent - warm amber/gold
  secondary: {
    DEFAULT: '#F5A623',    // Warm amber
    light: '#FFD166',      // Soft gold
    dark: '#D4920F',       // Deep amber
    muted: 'rgba(245, 166, 35, 0.15)',
  },

  // Tertiary - soft teal (for contrast and balance)
  tertiary: {
    DEFAULT: '#4ECDC4',    // Soft teal
    light: '#7EDDD6',      // Light teal
    dark: '#3DB8B0',       // Deep teal
    muted: 'rgba(78, 205, 196, 0.15)',
  },

  // Backgrounds
  bg: {
    primary: '#0A0A0A',    // Rich black
    secondary: '#141414',  // Card background
    tertiary: '#1E1E1E',   // Elevated surfaces
    elevated: '#262626',   // Highest elevation
  },

  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    tertiary: '#707070',
    disabled: '#505050',
  },

  // Borders
  border: {
    DEFAULT: '#2A2A2A',
    light: '#3A3A3A',
    focus: '#E85D75',
  },

  // Semantic colors
  success: '#4ADE80',      // Green
  warning: '#FBBF24',      // Amber
  error: '#EF4444',        // Red
  info: '#60A5FA',         // Blue

  // Action colors (for swipe feedback)
  like: '#4ADE80',         // Fresh green (not gendered)
  pass: '#6B7280',         // Neutral gray
  superlike: '#F5A623',    // Gold/amber
  match: '#E85D75',        // Primary brand

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.8)',
  glass: 'rgba(20, 20, 20, 0.85)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const typography = {
  // Font sizes
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  // Font weights
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
};

export const animations = {
  spring: {
    damping: 20,
    stiffness: 300,
  },
  springBouncy: {
    damping: 12,
    stiffness: 200,
  },
  timing: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
};

// Tab bar dimensions
export const layout = {
  tabBar: {
    height: 72,
    iconSize: 24,
    paddingBottom: 20,
    paddingTop: 12,
  },
  header: {
    height: 56,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  button: {
    height: 48,
    minWidth: 48,
    borderRadius: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    padding: 16,
  },
};

// Gradients
export const gradients = {
  primary: ['#E85D75', '#C44D63'],
  secondary: ['#F5A623', '#D4920F'],
  dark: ['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)'],
  card: ['rgba(30, 30, 30, 0.9)', 'rgba(20, 20, 20, 0.95)'],
};
