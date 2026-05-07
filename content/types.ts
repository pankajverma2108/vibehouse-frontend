export type NavItem = {
  label: string;
  href: string;
};

export type Badge = {
  label: string;
  color: string;
  textColor?: string;
};

export type RoomCardProps = {
  title: string;
  price: string;
  occupancy: string;
  image: string;
  images?: string[];
  badge?: Badge;
  features: string[];
  amenitiesLegend?: string[];
  href: string;
};

export type EventCardProps = {
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  price: string;
  image: string;
  capacity: string;
  href: string;
  badge?: Badge;
};

export type PolicySection = {
  id: string;
  title: string;
  content: string[];
};

export type PolicyPageContent = {
  title: string;
  lastUpdated: string;
  sections: PolicySection[];
};

export type BookingWidgetProps = {
  variant?: "hero" | "cta" | "inline";
  initialCheckIn?: string;
  initialCheckOut?: string;
  destinationHref?: string;
  submitLabel?: string;
  urgencyChips?: string[];
};
