/**
 * feels Design System — Tightened Rules
 *
 * Principles:
 * - Inclusive (not gendered — no pink/blue)
 * - Dark mode only, portrait only
 * - High contrast for accessibility
 * - Warm & inviting: coral, amber, teal on rich black
 * - Clean, minimal — no clutter
 * - Always lowercase "feels"
 *
 * Critical rules:
 * - Green = like (not red — avoids gendering)
 * - Gray = pass (not red — avoids negative framing)
 * - Coral = action, amber = premium, teal = info
 * - Min touch target: 48px
 * - Min body text: 15px
 * - Spring physics > linear easing
 */

export const colors = {
  // Primary — warm coral-rose (brand identity, CTAs, focus)
  primary: {
    DEFAULT: '#E85D75',
    light: '#FF8B9A',
    dark: '#C44D63',
    muted: 'rgba(232, 93, 117, 0.15)', // Active states ONLY, not general highlighting
  },

  // Secondary — warm amber/gold (premium features, earned status)
  secondary: {
    DEFAULT: '#F5A623',
    light: '#FFD166',
    dark: '#D4920F',
    muted: 'rgba(245, 166, 35, 0.15)',
  },

  // Tertiary — soft teal (balance accent, use sparingly)
  tertiary: {
    DEFAULT: '#4ECDC4',
    light: '#7EDDD6',
    dark: '#3DB8B0',
    muted: 'rgba(78, 205, 196, 0.15)',
  },

  // Background scale: base → card → elevated → highest
  bg: {
    primary: '#0A0A0A',
    secondary: '#141414',
    tertiary: '#1E1E1E',
    elevated: '#262626',
  },

  // Text hierarchy
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
    focus: '#E85D75', // Focus only
  },

  // Semantic colors
  success: '#4ADE80',
  warning: '#F59E0B',      // Distinct from amber secondary
  error: '#EF4444',        // Red reserved for errors only
  info: '#4ECDC4',         // Teal (not blue — blue reads "male")

  // Action colors (swipe feedback)
  like: '#4ADE80',         // Green — positive without gender
  pass: '#6B7280',         // Gray — neutral, no negative connotation
  premiumLike: '#F5A623',  // Gold/amber
  superlike: '#E85D75',    // Primary brand
  match: '#E85D75',        // Primary brand

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.8)',
  glass: 'rgba(20, 20, 20, 0.85)',
};

// Spacing — multiples of 4 only. Never use 20px or 40px.
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
};

// Border radius — 5 tokens only
export const borderRadius = {
  sm: 8,       // Small buttons, tags
  md: 12,      // Buttons, inputs, small cards
  lg: 16,      // Cards, modals
  xl: 24,      // Large cards, bottom sheets
  full: 9999,  // Pills, avatars, action buttons
};

// Typography — 6 sizes, 2 weights
export const typography = {
  sizes: {
    xs: 11,      // Captions — uppercase, 0.8px tracking
    sm: 13,      // Metadata, timestamps
    base: 15,    // Default body — minimum readable size
    title: 20,   // Card titles, prompts
    h2: 24,      // Section headers
    h1: 32,      // Profile names, major headings
  },

  // Two weights only
  weights: {
    normal: '400',   // Body text
    heading: '600',  // Headings, labels, captions
  },

  lineHeights: {
    heading: 1.2,
    body: 1.5,
    caption: 1.4,
  },

  letterSpacing: {
    tight: -0.5,    // Headings
    normal: 0,      // Body
    wide: 0.8,      // Captions (uppercase)
  },
};

// Shadows — use sparingly in dark mode, prefer borders
// No shadow on #0A0A0A or #141414 — they sit at bottom
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Interactive states — 10% lighter on hover, 10% darker on press
export const states = {
  hoverOpacity: 0.9,     // Slightly lighter
  pressOpacity: 0.7,     // Noticeably darker
  disabledOpacity: 0.5,  // Half opacity
};

export const animations = {
  // Spring configs
  spring: {
    damping: 25,
    stiffness: 300,   // Snappy (modals)
  },
  springBouncy: {
    damping: 12,
    stiffness: 300,   // Bouncy (like button)
  },
  springSmooth: {
    damping: 20,
    stiffness: 200,   // Smooth (card swipe)
  },

  // Timing — never use linear easing
  timing: {
    instant: 0,       // State changes, opacity
    fast: 150,        // Button presses, toggles
    normal: 250,      // Transitions, fades
    slow: 350,        // Attention, reveals
  },
};

// Layout dimensions
// IMPORTANT: Tab bar height is the MINIMUM. Add safe area inset at runtime:
//   height: Math.max(tabBar.height, tabBar.height + insets.bottom)
//   paddingBottom: Math.max(tabBar.paddingBottom, insets.bottom)
// This guarantees 72px minimum on iPhone SE and grows for notched devices.
export const layout = {
  tabBar: {
    height: 72,       // Base height — add safe area inset on notched devices
    iconSize: 24,
    paddingBottom: 20, // Fallback for non-notched devices
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
    height: 48,       // Min touch target
    minWidth: 48,
    borderRadius: 12,
  },
  actionButton: {
    size: 60,          // Like/pass circles
    borderWidth: 2,
    iconSize: 24,
  },
  input: {
    height: 48,
    borderRadius: 12,
    padding: 16,
  },
  photo: {
    heightPercent: 0.62, // 62% of screen
  },
  screen: {
    paddingHorizontal: 20,
  },
};

// Gradients
export const gradients = {
  primary: ['#E85D75', '#C44D63'],
  secondary: ['#F5A623', '#D4920F'],
  photoOverlay: ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)'],
  card: ['rgba(30, 30, 30, 0.9)', 'rgba(20, 20, 20, 0.95)'],
};
