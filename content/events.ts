import type { EventCardProps } from "@/content/types";

export const upcomingEvents: EventCardProps[] = [
  {
    title: "Neon DJ Night",
    date: "Mar 18, 2026",
    time: "9:00 PM",
    location: "Rooftop Terrace",
    price: "Free for Guests",
    image:
      "https://images.unsplash.com/photo-1758179764880-7513421d202a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
    capacity: "50 guests",
    href: "/events",
    badge: { label: "Tonight", color: "#c62828" },
  },
  {
    title: "Old City Pub Crawl",
    date: "Mar 19, 2026",
    time: "8:30 PM",
    location: "Meet at Lobby",
    price: "Rs. 599",
    image:
      "https://images.unsplash.com/photo-1763651961183-19eb504dee15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
    capacity: "30 guests",
    href: "/events",
    badge: { label: "Popular", color: "#facc15" },
  },
  {
    title: "Live Local Music",
    date: "Mar 20, 2026",
    time: "7:00 PM",
    location: "Common Area",
    price: "Free for Guests",
    image:
      "https://images.unsplash.com/photo-1647649644192-af6183269fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200",
    capacity: "40 guests",
    href: "/events",
    badge: { label: "Live", color: "#00d1ff" },
  },
];

export const eventPageContent = {
  upcomingSubtitle: "Packed with possibilities",
  weeklySubtitle: "Seven nights, seven different reasons to not head upstairs early.",
  pastSubtitle: "FOMO hitting now?",
};

export const weeklyLineup = [
  {
    day: "Monday",
    event: "Startup Talks / Founder Meet",
    hook: "Seats fill fast",
    description: "Ideas, founders, unexpected collabs",
    color: "#c62828",
  },
  {
    day: "Tuesday",
    event: "Game Night",
    hook: "Gets competitive real quick",
    description: "Strangers -> teammates -> friends",
    color: "#facc15",
  },
  {
    day: "Wednesday",
    event: "Open Mic Night",
    hook: "You might discover hidden talent",
    description: "Music, poetry, stand-up vibes",
    color: "#39ff14",
  },
  {
    day: "Thursday",
    event: "Networking Mixer",
    hook: "Where people actually connect",
    description: "Travelers, creators, remote workers",
    color: "#00d1ff",
  },
  {
    day: "Friday",
    event: "Party Night",
    hook: "Most talked-about night",
    description: "Packed, loud, unforgettable",
    color: "#c62828",
  },
  {
    day: "Saturday",
    event: "Coffee Crawl (Bangalore Edition)",
    hook: "Only for early signups",
    description: "Explore the best cafes in Bangalore",
    color: "#facc15",
  },
  {
    day: "Sunday",
    event: "Chill + Movie Night",
    hook: "Perfect reset before Monday",
    description: "Cozy, relaxed, community time",
    color: "#39ff14",
  },
];

export const pastEventImages = [
  "https://images.unsplash.com/photo-1681747971522-2d7a04c78321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  "https://images.unsplash.com/photo-1710144994421-a41e387e71c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  "https://images.unsplash.com/photo-1766113491996-19167a988455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  "https://images.unsplash.com/photo-1647649644192-af6183269fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  "https://images.unsplash.com/photo-1622646771382-1c9c090d3c37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  "https://images.unsplash.com/photo-1641352848574-9dbb6a244a32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
];
