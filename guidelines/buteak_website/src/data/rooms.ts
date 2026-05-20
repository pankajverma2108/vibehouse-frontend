
import { Room } from '@/types/room';

export const rooms: Room[] = [
  {
    id: "deluxe-king-room",
    title: "Deluxe King Room",
    description: "Spacious room with a king-size bed, elegant furnishings, and a luxurious marble bathroom.",
    longDescription: "Experience the height of luxury in our Deluxe King Room, where contemporary elegance meets comfort. This spacious accommodation features a plush king-size bed with premium linens, an elegant sitting area, and a marble bathroom complete with a rain shower and soaking tub. Enjoy breathtaking views of the city skyline from your window while enjoying amenities like a fully-stocked minibar, smart TV with streaming services, and complimentary high-speed Wi-Fi.",
    price: 299,
    priceModifiers: { "1": 0.9, "2": 1, "3": 1.2, "4": 1.3, "more": 1.5 },
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?q=80&w=2074&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop"
    ],
    amenities: ["King Bed", "City View", "42m²", "Minibar", "Smart TV", "Free WiFi", "Air Conditioning", "Room Service"],
    maxGuests: 2,
    rating: 4.8,
    reviews: 124
  },
  {
    id: "premium-suite",
    title: "Premium Suite",
    description: "Luxurious suite featuring a separate living area, premium amenities, and panoramic city views.",
    longDescription: "Our Premium Suite offers the ultimate luxury experience with a spacious layout that includes a separate bedroom and living area. The suite boasts floor-to-ceiling windows providing panoramic views of the city skyline, a private balcony, and a luxurious bathroom with a jacuzzi tub and separate shower. Guests enjoy premium amenities including a fully-stocked bar, personalized butler service, and exclusive access to our Executive Lounge with complimentary refreshments throughout the day.",
    price: 499,
    priceModifiers: { "1": 0.95, "2": 1, "3": 1.1, "4": 1.2, "more": 1.3 },
    image: "https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=2067&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=2067&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?q=80&w=2074&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1594560913095-8cf34bab82ad?q=80&w=2069&auto=format&fit=crop"
    ],
    amenities: ["King Bed", "Panoramic View", "65m²", "Jacuzzi", "Butler Service", "Free WiFi", "Mini Kitchen", "24/7 Service"],
    maxGuests: 3,
    rating: 4.9,
    reviews: 87
  },
  // {
  //   id: "executive-double-room",
  //   title: "Executive Double Room",
  //   description: "Perfect for families or groups, featuring two queen beds and modern amenities for a comfortable stay.",
  //   longDescription: "The Executive Double Room is ideal for families or small groups, offering ample space and two plush queen beds with luxury linens. This thoughtfully designed room features modern decor, a well-appointed work area, and a comfortable seating area to relax after a day of exploring. The spacious bathroom includes premium toiletries, plush robes, and slippers. Guests enjoy views of our beautiful pool area while having access to high-speed internet, a smart TV with streaming services, and 24-hour room service.",
  //   price: 359,
  //   priceModifiers: { "1": 1, "2": 1, "3": 1, "4": 1.1, "more": 1.25 },
  //   image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop",
  //   gallery: [
  //     "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop",
  //     "https://images.unsplash.com/photo-1587985064135-0366536eab42?q=80&w=2070&auto=format&fit=crop",
  //     "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2070&auto=format&fit=crop",
  //     "https://images.unsplash.com/photo-1631049552057-403cdb8f0658?q=80&w=2070&auto=format&fit=crop"
  //   ],
  //   amenities: ["Two Queen Beds", "Pool View", "50m²", "Workspace", "Room Service", "Free WiFi", "Smart TV", "Coffee Machine"],
  //   maxGuests: 4,
  //   rating: 4.7,
  //   reviews: 156
  // },
  {
    id: "luxury-ocean-view-suite",
    title: "Luxury Ocean View Suite",
    description: "Experience ultimate luxury with stunning ocean views, a spacious living area, and premium amenities.",
    longDescription: "The Luxury Ocean View Suite is our most exclusive accommodation, offering an unparalleled experience with breathtaking panoramic ocean views from both the bedroom and separate living area. This expansive suite features elegant decor, a king-size bed with premium linens, a spacious marble bathroom with double vanity, a deep soaking tub, and a separate rain shower. The suite includes a private balcony perfect for watching the sunset, a dining area, and a fully-stocked premium bar. Guests enjoy 24/7 butler service, priority reservations at our restaurants, and complimentary airport transfers.",
    price: 599,
    priceModifiers: { "1": 0.9, "2": 1, "3": 1.15, "4": 1.25, "more": 1.4 },
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1584132869994-873f9363a562?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop"
    ],
    amenities: ["King Bed", "Ocean View", "80m²", "Private Balcony", "24/7 Butler", "Free WiFi", "Premium Bar", "Dining Area"],
    maxGuests: 2,
    rating: 5.0,
    reviews: 92
  }
];

export const getRoom = (id: string): Room | null => {
  return rooms.find(room => room.id === id) || null;
};
