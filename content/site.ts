import type { NavItem } from "@/content/types";
import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

export const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Property", href: getDefaultPropertyDestinationHref() },
  { label: "Experiences", href: "/events" },
  { label: "About", href: "/about" },
];

export const footerLinks = {
  quickLinks: [
    ...navItems,
    { label: "Upcoming", href: "/upcoming" },
    { label: "Partner With Us", href: "/partner-with-us" },
  ],
  legal: [
    { label: "Policies", href: "/policies" },
  ],
};

export const siteMeta = {
  name: "Vibehouse",
  tagline: "Stay. Mix. Repeat.",
  description:
    "A boutique social sanctuary and coliving hub in Koramangala, Bangalore. Designer private rooms, acoustic pod dorms, rooftop culture, and high-speed fiber.",
  contact: {
    email: "hello@vibehouse.co",
    emailHref: "mailto:hello@vibehouse.co",
    addressLines: [
      "Vibehouse Koramangala",
      "13/14, Bank Officer Housing Co-operative Society",
      "Bengaluru Urban, Karnataka, India",
    ],
    instagramHref: "https://instagram.com/vibehouse",
    mapsHref: "https://maps.app.goo.gl/jJKJUUKzdmFJGbCG6?g_st=aw",
  },
};
