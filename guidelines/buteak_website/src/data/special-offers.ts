export interface OfferData {
  title: string;
  description: string;
  features: string[];
  image: string;
  badgeText: string;
  badgeColor: string;
  cardColor: string;
  textColor: string;
}

export const specialOffers: OfferData[] = [
  {
    title: "Stay Longer, Save More",
    description:
      "More than 30 days: 20% discount\n15-30 days: 15% discount\n10-15 days: 10% discount\nExtend your stay and save more!",
    features: [],
    image: "images/offers/staylonger.png",
    badgeText: "SAVE 20%",
    badgeColor: "bg-hotel-accent text-white",
    cardColor: "bg-gradient-to-r from-hotel-primary to-hotel-primary/80",
    textColor: "text-white",
  },
  {
    title: "Join the Buteak Fan Club and Enjoy Exclusive Benefits",
    description:
      "Become a member of the Buteak Fan Club to receive a 10% discount on every booking you make with us. As a valued member, you'll also gain access to exclusive offers and promotions designed to enhance your stay.",
    features: [],
    image: "images/offers/join-the-fan-club.png",
    badgeText: "MEMBERS",
    badgeColor: "bg-white text-hotel-accent",
    cardColor: "bg-gradient-to-r from-hotel-accent to-hotel-accent/80",
    textColor: "text-white",
  },
  // {
  //   title: "Stay 3+ Nights & Save Up to 30%",
  //   description: "Book 3 or more nights and enjoy up to 30% off your stay!",
  //   features: [],
  //   image: "/",
  //   badgeText: "SAVE 30%",
  //   badgeColor: "bg-white text-hotel-accent",
  //   cardColor: "bg-gradient-to-r from-hotel-primary to-hotel-primary/80",
  //   textColor: "text-white"
  // }
];
