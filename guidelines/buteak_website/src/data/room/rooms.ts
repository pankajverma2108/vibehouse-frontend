
import { Room } from '@/types/room';
import { Bed, Utensils, Sofa, Hotel, BedDouble, PanelsTopLeft } from "lucide-react";
import React from 'react';
import { fetchRoomPrices, mapRoomTypeToRoomId } from '@/services/priceApi';

// Base room data
const baseRooms: Room[] = [
  {
    id: "medium-suite",
    title: "1BHK Medium Suite",
    description: "Cozy and comfortable room with a queen-size bed, perfect for solo travelers or couples.",
    longDescription: "Our Standard Queen Room offers the perfect blend of comfort and value. This well-appointed room features a plush queen-size bed with premium linens, a work desk, and a modern bathroom with a walk-in shower. Designed with both business and leisure travelers in mind, this room provides all essential amenities including complimentary Wi-Fi, a smart TV with streaming capabilities, individually controlled air conditioning, and a coffee maker. The room's calming color palette and thoughtful design create a relaxing environment after a day of exploration or business meetings.",
    price: 3299, // Fallback price
    priceModifiers: { "1": 0.9, "2": 1, "3": 1.2, "4": 1.3, "more": 1.5 },
    image: "https://d1l9ecif91hu4p.cloudfront.net/images+/room/bedroom.jpg",
    gallery: [
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/bedroom.jpg",
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/sofa.jpg",
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/kitchen.jpg",
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/washroom.jpg",
    ],
    amenities: [
      { label: "Queen-size bed", icon: React.createElement(Bed, { size: 32 }) },
      { label: "Attached Kitchen", icon: React.createElement(Utensils, { size: 32 }) },
      { label: "Living Room with balcony", icon: React.createElement(Sofa, { size: 32 }) },
    ],
    maxGuests: 2,
    rating: 4.5,
    reviews: 98,
    idealFor: "Solo travelers or couples looking for stylish, efficient living with a private balcony and homey comfort.",
    // size: "460 sq. ft. Area",
  },
  {
    id: "large-suite",
    title: "1BHK Large Suite",
    description: "Spacious room with a king-size bed, elegant furnishings, and a luxurious marble bathroom.",
    longDescription: "Experience the height of luxury in our Deluxe King Room, where contemporary elegance meets comfort. This spacious accommodation features a plush king-size bed with premium linens, an elegant sitting area, and a marble bathroom complete with a rain shower and soaking tub. Enjoy breathtaking views of the city skyline from your window while enjoying amenities like a fully-stocked minibar, smart TV with streaming services, and complimentary high-speed Wi-Fi.",
    price: 3599, // Fallback price
    priceModifiers: { "1": 0.9, "2": 1, "3": 1.2, "4": 1.3, "more": 1.5 },
    image: "https://d1l9ecif91hu4p.cloudfront.net/images+/room/large-bedroom.jpg",
    gallery: [
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/large-bedroom.jpg",
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/large-sofa.jpg",
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/large-kitchen.jpg",
      "https://d1l9ecif91hu4p.cloudfront.net/images+/room/large-cubord.jpg",],
    amenities: [
      { label: "Larger Bedroom", icon: React.createElement(BedDouble, { size: 32 }) },
      { label: "Spacious Kitchen,", icon: React.createElement(Utensils, { size: 32 }) },
      { label: "Living Room with balcony", icon: React.createElement(PanelsTopLeft, { size: 32 }) },
      { label: "Extended Lounge Space", icon: React.createElement(Hotel, { size: 32 }) },
    ],
    maxGuests: 2,
    rating: 4.8,
    reviews: 124,
    idealFor: "Guests wanting more room to unwind, cook, or work — perfect for longer stays or anyone seeking extra space.",

  },
];

// Dynamic rooms with API prices
let cachedRooms: Room[] | null = null;

export const getRoomsWithPrices = async (): Promise<Room[]> => {
  if (cachedRooms) return cachedRooms;
  
  try {
    const apiPrices = await fetchRoomPrices();
    
    cachedRooms = baseRooms.map(room => {
      const apiPrice = apiPrices.find(price => 
        mapRoomTypeToRoomId(price.roomTypeId) === room.id
      );
      
      return {
        ...room,
        price: apiPrice ? apiPrice.priceWithTax : room.price
      };
    });
    
    return cachedRooms;
  } catch (error) {
    console.error('Failed to fetch prices, hiding room cards:', error);
    return [];
  }
};

export const getRoom = async (id: string): Promise<Room | null> => {
  try {
    const roomsWithPrices = await getRoomsWithPrices();
    return roomsWithPrices.find(room => room.id === id) || null;
  } catch (error) {
    console.error('Error in getRoom:', error);
    // Fallback to base rooms if API fails
    return baseRooms.find(room => room.id === id) || null;
  }
};

// Export for backward compatibility
export const rooms = baseRooms;
