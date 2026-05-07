import type { CSSProperties } from "react";

export const fontFamilies = {
  navHeading: '"Geologica", "Segoe UI", sans-serif',
  navBody: '"Geologica", "Segoe UI", sans-serif',
} as const;

export const navFontStyles = {
  menuHeading: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  } satisfies CSSProperties,
  tileTitle: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  } satisfies CSSProperties,
  tileSubtitle: {
    fontFamily: fontFamilies.navBody,
    fontStyle: "italic",
    fontWeight: 500,
  } satisfies CSSProperties,
  badgeCaps: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  sticker: {
    fontFamily: fontFamilies.navBody,
    fontStyle: "italic",
    fontWeight: 700,
  } satisfies CSSProperties,
  desktopCardTitle: {
    fontFamily: fontFamilies.navHeading,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  desktopCardLink: {
    fontFamily: fontFamilies.navBody,
    fontWeight: 600,
  } satisfies CSSProperties,
};
