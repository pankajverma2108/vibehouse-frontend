import { getDefaultPropertyDestinationHref } from "@/lib/cx-api";

export type HostelNavItem = {
  id: string;
  label: string;
  href: string;
};

export const hostelNavItems: HostelNavItem[] = [
  {
    id: "60765",
    label: "TDSocial Koramangala Hostel",
    href: getDefaultPropertyDestinationHref("60765"),
  },
  {
    id: "tdsocial-stay-koramangala",
    label: "TDSocial Stay at Koramangala",
    href: "/upcoming",
  },
  {
    id: "buteak-suites-koramangala-club-rd",
    label: "Buteak Suites Koramangala Club Rd",
    href: "/upcoming",
  },
];

export const primaryHostelHref = hostelNavItems[0]?.href ?? "/property";
