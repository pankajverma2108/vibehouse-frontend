export type GuestStickerTagConfig = {
  label: string;
  bg: string;
  text: string;
  rotate: string;
};

export const guestStickerTags = {
  shell: { label: "Guest mode", bg: "#c62828", text: "#ffffff", rotate: "rotate-[2deg]" },
  dashboard: { label: "Confirmed", bg: "#c62828", text: "#ffffff", rotate: "rotate-[6deg]" },
  services: { label: "Front desk", bg: "#c62828", text: "#ffffff", rotate: "rotate-[-2deg]" },
  addons: { label: "Add-ons", bg: "#c62828", text: "#ffffff", rotate: "rotate-[2deg]" },
  borrow: { label: "Gear", bg: "#c62828", text: "#ffffff", rotate: "rotate-[-2deg]" },
  extend: { label: "Popular", bg: "#facc15", text: "#111111", rotate: "rotate-[-5deg]" },
  guide: { label: "The rules", bg: "#c62828", text: "#ffffff", rotate: "rotate-[2deg]" },
  lostFound: { label: "Found desk", bg: "#c62828", text: "#ffffff", rotate: "rotate-[-1deg]" },
  checkout: { label: "Pay desk", bg: "#c62828", text: "#ffffff", rotate: "rotate-[1deg]" },
  review: { label: "Review", bg: "#c62828", text: "#ffffff", rotate: "rotate-[-2deg]" },
  notice: { label: "Neighborhood", bg: "#facc15", text: "#111111", rotate: "rotate-[1deg]" },
} satisfies Record<string, GuestStickerTagConfig>;
