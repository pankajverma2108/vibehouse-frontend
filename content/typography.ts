import type { CSSProperties } from "react";

export const fontFamilies = {
  navHeading: '"Gilroy", -apple-system, BlinkMacSystemFont, sans-serif',
  navBody: '"Gilroy", -apple-system, BlinkMacSystemFont, sans-serif',
  editorial: '"Cirka", "Libre Bodoni", serif',
} as const;

export const navFontStyles = {
  menuHeading: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  tileTitle: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  tileSubtitle: {
    fontFamily: fontFamilies.navBody,
    fontWeight: 500,
    letterSpacing: "0.02em",
  } satisfies CSSProperties,
  badgeCaps: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 800,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  sticker: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  desktopCardTitle: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  desktopCardLink: {
    fontFamily: fontFamilies.navBody,
    fontWeight: 600,
    letterSpacing: "0.04em",
  } satisfies CSSProperties,
};
