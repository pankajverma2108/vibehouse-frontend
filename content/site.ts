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
  name: "The Daily Social",
  tagline: "Stay. Mix. Repeat.",
  description:
    "A vibrant hostel marketing site for travelers looking for community, safe stays, and memorable nights.",
  contact: {
    phoneDisplay: "+91 88849 73328",
    phoneHref: "tel:+918884973328",
    email: "thedailysocial01@gmail.com",
    emailHref: "mailto:thedailysocial01@gmail.com",
    addressLines: [
      "The Daily Social Koramangala",
      "13/14, Bank Officer Housing Co-operative Society",
      "Bengaluru Urban, Karnataka, India",
    ],
    instagramHref: "https://instagram.com/thedailysocial01",
    mapsHref: "https://maps.app.goo.gl/jJKJUUKzdmFJGbCG6?g_st=aw",
  },
};
