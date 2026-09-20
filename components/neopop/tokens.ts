/**
 * NeoPOP Design Tokens
 * Conforming strictly to migration-plan/NEOPOP_DESIGN_SYSTEM_INSTRUCTIONS.md
 * Derived from CRED-CLUB/neopop-web
 */

export const colorPalette = {
  // Deep atmospheric dark layered surfaces (from partner & upcoming)
  black: {
    500: '#0A0A0E', // Primary dark canvas
    400: '#12131A', // Surface: nav, panels, dialogs
    300: '#171822', // Raised surface: cards, lanes, active work
    200: '#2A2A38', // Neutral edges, borders, inactive controls
    100: '#1C1D28', // Subtle dividers
  },
  // White hierarchy & warm ice
  white: {
    500: '#FFFFFF', // High-emphasis labels, pure white
    300: '#F3EEE6', // Warm ice headings, primary text
    100: '#D2D2D8', // Supporting text and quiet icons
    secondary: 'rgba(243, 238, 230, 0.72)', // Supporting copy
    border: 'rgba(255, 255, 255, 0.14)', // Quiet separators
    borderEmphasized: 'rgba(255, 255, 255, 0.28)', // Hover / active containment
  },
  // Affirmative momentum semantics
  semantic: {
    affirmative: '#FF2E62', // Vibehouse Crimson: primary action, next step, active selection
    brand: '#FF2E62', // Primary Brand Crimson
    brandHover: '#FF426F', // Crimson Hover State
    brandEdge: '#991438', // Crimson Bevel Edge
    progress: '#3BFFAD', // Green: completed progress, live/healthy, positive confirmation
    focus: '#FF2E62', // Keyboard focus & active context
    celebration: '#FF426F', // Pink: milestones, completion moments, celebratory CTA
    amber: '#FFCB45', // Amber: secondary alert, highlight badge
    error: '#EE4D37', // Red: failure, destructive action, invalid field
    neutral: '#2A2A38', // Dark gray: counts, quiet badges, inactive state
  },
} as const;

export const geometry = {
  containerRadius: '0px',
  elementRadius: '0px',
  plunkWidth: '3px',
  plunkAngle: '45deg',
  lowOffset: '3px 3px 0',
  highOffset: '6px 6px 0',
  focusOutline: '2px solid #3BFFAD',
  focusOffset: '3px',
} as const;

export const motion = {
  pressDuration: '120ms',
  pressEase: 'cubic-bezier(0.2, 0, 0, 1)',
  pressTransform: 'translate3d(3px, 3px, 0)',
} as const;

export const spacing = {
  base: 4, // 4px multiplier base
  get: (units: number) => `${units * 4}px`,
} as const;

export const typography = {
  fonts: {
    editorial: "'Geologica', sans-serif",
    display: "'Geologica', sans-serif",
    body: "'Lexend', sans-serif",
    utility: "'Lexend', sans-serif",
  },
  tracking: {
    tight: '-0.02em',
    normal: '0em',
    utility: '0.055em',
    wide: '0.12em',
  },
} as const;

export const neopopTokens = {
  colorPalette,
  geometry,
  motion,
  spacing,
  typography,
} as const;

export default neopopTokens;
