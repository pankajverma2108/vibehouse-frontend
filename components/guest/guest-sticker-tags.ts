export type GuestStickerTagConfig = {
  label: string;
  bg: string;
  text: string;
  rotate: string;
};

export const guestStickerTags = {
  shell: { label: "Guest mode", bg: "#f9cb37", text: "#111111", rotate: "rotate-[2deg]" },
  dashboard: { label: "Confirmed", bg: "#c62828", text: "#ffffff", rotate: "rotate-[2deg]" },
  services: { label: "Concierge", bg: "#c62828", text: "#ffffff", rotate: "rotate-[-2deg]" },
  addons: { label: "Guest picks", bg: "#f9cb37", text: "#111111", rotate: "rotate-[2deg]" },
  rentals: { label: "Available today", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[-2deg]" },
  upgrades: { label: "Popular", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" },
  guide: { label: "Companion", bg: "#c62828", text: "#ffffff", rotate: "rotate-[2deg]" },
  lostFound: { label: "Care desk", bg: "#3a5f84", text: "#ffffff", rotate: "rotate-[-1deg]" },
  checkout: { label: "Stay ledger", bg: "#c62828", text: "#ffffff", rotate: "rotate-[1deg]" },
  review: { label: "Guest note", bg: "#f9cb37", text: "#111111", rotate: "rotate-[-2deg]" },
  notice: { label: "Neighborhood", bg: "#facc15", text: "#111111", rotate: "rotate-[1deg]" },
} satisfies Record<string, GuestStickerTagConfig>;
