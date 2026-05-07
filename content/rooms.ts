import type { RoomCardProps } from "@/content/types";
import type { CxRoomCategory } from "@/lib/cx-api";

const mixedDormImages = [
  "/images/rooms/room-1.jpg",
  "/images/rooms/room-2.jpg",
  "/images/rooms/room-3.webp",
];

const femaleDormImages = [
  "/images/rooms/room-2.jpg",
  "/images/rooms/room-3.webp",
  "/images/rooms/room-4.jpg",
];

const privateRoomImages = [
  "/images/rooms/room-4.jpg",
  "/images/rooms/room-1.jpg",
  "/images/rooms/room-3.webp",
];

export const rooms: RoomCardProps[] = [
  {
    title: "4-Bed Mixed Dorm",
    price: "Rs. 599",
    occupancy: "4 Guests",
    image: mixedDormImages[0],
    images: mixedDormImages,
    badge: { label: "Most Popular", color: "#c62828" },
    features: [
      "Reading lights",
      "Privacy curtains",
      "USB charging ports",
      "Individual lockers",
    ],
    amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
    href: "/property",
  },
  {
    title: "4-Bed Female Dorm",
    price: "Rs. 599",
    occupancy: "4 Guests",
    image: femaleDormImages[0],
    images: femaleDormImages,
    badge: { label: "Safe Space", color: "#39ff14", textColor: "#0f172a" },
    features: [
      "Women-only space",
      "En-suite bathroom",
      "Reading lights",
      "Privacy curtains",
    ],
    amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
    href: "/property",
  },
  {
    title: "Private Room",
    price: "Rs. 1,299",
    occupancy: "2 Guests",
    image: privateRoomImages[0],
    images: privateRoomImages,
    badge: { label: "Privacy", color: "#00d1ff", textColor: "#0f172a" },
    features: [
      "Queen-size bed",
      "En-suite bathroom",
      "Work desk",
      "Mini-fridge",
    ],
    amenitiesLegend: ["AC", "Private bath", "Fresh linen", "Housekeeping"],
    href: "/property",
  },
];

export const propertyHero = {
  eyebrow: "Property",
  title: "The Daily Social",
  location: "Koramangala",
  blurb:
    "A social stay with clean rooms, practical shared spaces, and an easy Koramangala location for short trips, work stays, and longer city living.",
  addressName: "The Daily Social Koramangala",
  address:
    "13/14, Bank Officer Housing Co-operative Society, Bengaluru Urban, Karnataka, India",
  mapsHref: "https://maps.app.goo.gl/jJKJUUKzdmFJGbCG6?g_st=aw",
};

export const propertyGallery = [
  {
    src: "/images/property/hero-1.jpg",
    alt: "The Daily Social dorm interior",
  },
  {
    src: "/images/property/hero-2.jpg",
    alt: "Shared social seating area",
  },
  {
    src: "/images/property/hero-3.jpg",
    alt: "Rooftop city-facing lounge",
  },
  {
    src: "/images/property/hero-4.jpg",
    alt: "Private room interior",
  },
];

export const propertyOverview = [
  "The Daily Social Koramangala brings together straightforward comfort and a social, city-friendly atmosphere for guests who want more than a plain overnight stop.",
  "The property is set up to feel calm when you need rest and connected when you want common spaces, with room categories that work for solo guests, friends, and flexible stays.",
  "Its location makes it easy to step out for coffee, work meetings, food runs, and evenings in the neighborhood while still returning to a stay that feels organized and welcoming.",
];

export const propertyAmenities = [
  { icon: "snowflake", label: "Air conditioner" },
  { icon: "camera", label: "CCTV" },
  { icon: "building", label: "Elevator" },
  { icon: "sparkles", label: "Housekeeping" },
  { icon: "car", label: "Parking" },
  { icon: "paw-print", label: "Pet friendly" },
  { icon: "waves", label: "Pool" },
  { icon: "battery-charging", label: "Power backup" },
  { icon: "smartphone", label: "Smart room" },
  { icon: "glass-water", label: "Water dispenser" },
  { icon: "wifi", label: "Wi-Fi" },
  { icon: "briefcase", label: "Workation" },
];

export const locationMap = {
  title: "The Daily Social Koramangala",
  address:
    "13/14, Bank Officer Housing Co-operative Society, Bengaluru Urban, Karnataka, India",
  embedUrl:
    "https://www.google.com/maps?q=13%2F14%2C+Bank+Officer+Housing+Co-operative+Society%2C+Bengaluru+Urban%2C+Karnataka%2C+India&output=embed",
};

export const nearbyAttractions = [
  { name: "Forum South Bengaluru", travel: "8 min drive", type: "Shopping" },
  { name: "Sony World Signal", travel: "7 min drive", type: "Transit" },
  { name: "St. John's Cafes", travel: "6 min drive", type: "Food & Coffee" },
  { name: "Lalbagh Botanical Garden", travel: "18 min drive", type: "City Escape" },
];

export const roomCategories: CxRoomCategory[] = [
  {
    roomTypeId: "mixed-4-bed",
    roomType: "4-Bed Mixed Dorm",
    slug: "mixed-4-bed",
    title: "Bed in 4-Bed Mixed Dorm",
    shortTitle: "4-Bed Mixed Dorm",
    image: mixedDormImages[0],
    images: mixedDormImages,
    inventoryState: "unknown",
    hasLiveAvailability: false,
    guestText: "x 1 Guest",
    basePrice: 599,
    totalPrice: 599,
    availableCount: 7,
    totalCount: 7,
    inventoryText: "07 beds available",
    features: ["Privacy curtain", "Reading light", "USB charging", "Personal locker"],
    amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
  },
  {
    roomTypeId: "female-4-bed",
    roomType: "4-Bed Female Dorm",
    slug: "female-4-bed",
    title: "Bed in 4-Bed Female Dorm",
    shortTitle: "4-Bed Female Dorm",
    image: femaleDormImages[0],
    images: femaleDormImages,
    inventoryState: "unknown",
    hasLiveAvailability: false,
    guestText: "x 1 Guest",
    basePrice: 599,
    totalPrice: 599,
    availableCount: 5,
    totalCount: 5,
    inventoryText: "05 beds available",
    features: ["Women-only floor", "En-suite access", "Reading light", "Secure locker"],
    amenitiesLegend: ["AC", "Locker", "Fresh linen", "Housekeeping"],
  },
  {
    roomTypeId: "private-room",
    roomType: "Private Room",
    slug: "private-room",
    title: "Private Room",
    shortTitle: "Private Room",
    image: privateRoomImages[0],
    images: privateRoomImages,
    inventoryState: "unknown",
    hasLiveAvailability: false,
    guestText: "x 2 Guests",
    basePrice: 1299,
    totalPrice: 1299,
    availableCount: 3,
    totalCount: 3,
    inventoryText: "03 rooms left",
    features: ["Queen bed", "En-suite bathroom", "Work desk", "Mini-fridge"],
    amenitiesLegend: ["AC", "Private bath", "Fresh linen", "Housekeeping"],
  },
];

export const bookingSummary = {
  title: "Summary",
  note: "Select dates to review category availability and continue with your preferred stay option.",
  highlights: [
    "Check-in at 1:00 PM",
    "Check-out at 10:00 AM",
    "Direct support from the property team",
  ],
  policiesNote:
    "By continuing, you confirm that all guests meet the property's stay requirements and agree to the booking and guideline policies.",
};

export const propertyGuidelines = {
  checkIn: "1:00 PM",
  checkOut: "10:00 AM",
  summary: [
    "All guests must carry a government-issued photo ID during check-in.",
    "Local ID acceptance is subject to property policy and management discretion.",
    "Outside visitors are not allowed beyond designated guest areas without approval.",
    "Cancellation and modification windows depend on the selected booking type.",
    "No-shows and early departures may be treated as fully chargeable stays.",
  ],
  sections: [
    {
      title: "Check In And Check Out",
      content: [
        "Check-in begins at 1:00 PM and check-out is by 10:00 AM.",
        "Early check-in is subject to same-day availability.",
        "Valid identification is required at arrival.",
      ],
    },
    {
      title: "Reservation Policy",
      content: [
        "Rates and category availability may change until the reservation is confirmed.",
        "Room allocation is based on booked category rather than exact room number selection.",
        "Advance payment requirements may vary by booking type.",
      ],
    },
    {
      title: "Stay Policy",
      content: [
        "Please respect noise, smoking, and visitor rules across the property.",
        "Guests may be charged for serious policy violations or property damage.",
        "Operational rules may be updated for guest comfort and safety.",
      ],
    },
  ],
};

export const roomFaqs = [
  {
    question: "Can I get an early check-in?",
    answer:
      "Standard check-in begins at 1:00 PM. Early check-in may be possible on the day of arrival if the room category is ready sooner.",
  },
  {
    question: "Is there food available in the property?",
    answer:
      "Koramangala has plenty of nearby cafes, breakfast spots, and delivery options, and the team can recommend easy nearby choices.",
  },
  {
    question: "Are guests or outsiders allowed?",
    answer:
      "Visitor access is controlled for guest safety and depends on the property's operational rules. Please confirm directly with the front desk.",
  },
  {
    question: "Are there discounts for long stays?",
    answer:
      "Extended-stay pricing can often be discussed directly with the team before booking, especially for multi-week stays.",
  },
  {
    question: "Is Wi-Fi available?",
    answer:
      "Yes. Wi-Fi is available across guest areas and common spaces.",
  },
  {
    question: "Do you have lockers for valuables?",
    answer:
      "Selected room categories include secure storage options, and the team can help clarify what comes with each category.",
  },
  {
    question: "Can I leave my luggage after checkout until evening?",
    answer:
      "Short-term luggage assistance may be possible depending on same-day operations. It is best to confirm this with the property team.",
  },
  {
    question: "Who do I contact if I have a query?",
    answer:
      "You can contact The Daily Social directly using the listed phone number or email before arrival.",
  },
];
