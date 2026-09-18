/**
 * NeoPOP Design Tokens
 * Conforming strictly to migration-plan/NEOPOP_DESIGN_SYSTEM_INSTRUCTIONS.md
 * Derived from CRED-CLUB/neopop-web
 */

export const colorPalette = {
  // Near-black layered surfaces
  black: {
    500: '#0D0D0D', // Primary dark canvas
    400: '#121212', // Surface: nav, panels, dialogs
    300: '#161616', // Raised surface: cards, lanes, active work
    200: '#3D3D3D', // Neutral edges, borders, inactive controls
    100: '#262626', // Subtle dividers
  },
  // White hierarchy
  white: {
    500: '#FFFFFF', // Headings, primary labels, high-emphasis controls
    300: '#EFEFEF', // Secondary headings or light section text
    100: '#D2D2D2', // Supporting text and quiet icons
    secondary: 'rgba(255, 255, 255, 0.62)', // Supporting copy
    border: 'rgba(255, 255, 255, 0.16)', // Quiet separators
    borderEmphasized: 'rgba(255, 255, 255, 0.36)', // Hover / active containment
  },
  // Affirmative momentum semantics
  semantic: {
    affirmative: '#FFCB45', // Yellow: primary action, next step, active selection
    progress: '#3BFFAD', // Green: completed progress, live/healthy, positive confirmation
    focus: '#3F6FD9', // Blue: keyboard focus, active work, selected context
    celebration: '#FF426F', // Pink: milestones, completion moments, celebratory CTA
    error: '#EE4D37', // Red: failure, destructive action, invalid field
    neutral: '#3D3D3D', // Dark gray: counts, quiet badges, inactive state
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
    editorial: "'Cirka', 'Libre Bodoni', serif",
    display: "'Gilroy', 'Urbanist', sans-serif",
    body: "'Gilroy', 'Urbanist', sans-serif",
    utility: "'Gilroy', 'Urbanist', sans-serif",
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
