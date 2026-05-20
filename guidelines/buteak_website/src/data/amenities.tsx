import React from 'react';
import { AmenitiesData } from '@/types/amenity';
import {
  Bath,
  Bed,
  Tv,
  Shield,
  DoorOpen,
  Wifi,
  UtensilsCrossed,
  Thermometer,
  TentTree,
  Luggage,
  Sofa,
  FireExtinguisher,
  DumbbellIcon,
  BookOpenText,
  ShieldAlert,
  KeySquare
} from 'lucide-react';

export const amenitiesData: AmenitiesData = {
  bathroom: {
    title: "Bathroom Amenities",
    icon: <Bath size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Bath", icon: "shower", description: "Luxurious bathtub with premium fixtures" },
      { name: "Hair Dryer", icon: "hairdryer", description: "Powerful hair dryer provided" },
      { name: "Cleaning Products", icon: "spray-can", description: "Eco-friendly cleaning supplies" },
      { name: "Dove Shampoo", icon: "shampoo", description: "Premium Dove shampoo provided" },
      { name: "Body Soap", icon: "soap", description: "Gentle, moisturizing body soap" },
      { name: "Bidet", icon: "bidet", description: "Modern bidet fixture" },
      { name: "Hot Water", icon: "thermometer", description: "24/7 hot water availability" },
      { name: "Shower Gel", icon: "shower-head", description: "Luxury shower gel" }
    ]
  },
  bedroom: {
    title: "Bedroom & Laundry",
    icon: <Bed size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Washing Machine", icon: "washing-machine", description: "In-unit washing machine" },
      { name: "Clothes Dryer", icon: "hanger", description: "Convenient clothes dryer" },
      { name: "Essentials", icon: "hanger", description: "Towels, bed sheets, soap, toilet paper" },
      { name: "Hangers", icon: "hanger", description: "Plenty of hangers provided" },
      { name: "Cotton Bed Linen", icon: "bed", description: "High thread-count cotton sheets" },
      { name: "Extra Pillows & Blankets", icon: "bed", description: "Additional comfort items" },
      { name: "Room-Darkening Blinds", icon: "blinds", description: "For a peaceful sleep" },
      { name: "Iron", icon: "iron", description: "Iron with ironing board" },
      { name: "Hair Dryer on Request", icon: "hairdryer", description: "Available upon request" },
      { name: "Clothes Ironing on Request", icon: "iron", description: "Service available upon request" },
      { name: "Clothes Drying Rack", icon: "drying-rack", description: "Convenient drying solution" },
      { name: "Wardrobe", icon: "wardrobe", description: "Spacious storage for your belongings" }
    ]
  },
  outdoor: {
    title: "Outdoor Features",
    icon: <TentTree size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Private Patio or Balcony", icon: "balcony", description: "Enjoy outdoor space in privacy" }
    ]
  },
  services: {
    title: "Services",
    icon: <Luggage size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Luggage Drop-Off Allowed", icon: "suitcase", description: "Convenient luggage handling" },
      { name: "Self Check-In", icon: "key", description: "Easy self check-in process" },
      { name: "24-Hour Housekeeping", icon: "trash", description: "Round the clock cleaning service" },
      { name: "Waiting Lounge", icon: "sofa", description: "Comfortable area to wait" }
    ]
  },
  entertainment: {
    title: "Entertainment",
    icon: <Tv size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Smart TV", icon: "tv", description: "High definition TV with streaming capabilities" },
      { name: "Board Games / Books", icon: "tv", description: "Various entertainment options" }
    ]
  },
  safety: {
    title: "Home Safety",
    icon: <Shield size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Security Cameras", icon: "security-camera", description: "Exterior security coverage" },
      { name: "First Aid Kit", icon: "first-aid-kit", description: "Emergency first aid supplies" },
      { name: "Window Guards", icon: "door-open", description: "Safety measures for windows" },
      { name: "Fire Extinguisher", icon: "trash", description: "Safety equipment in case of fire" },
      { name: "Security Alarm System", icon: "door-open", description: "Enhanced security" },
      { name: "Safe Deposit Box", icon: "door-open", description: "Secure storage for valuables" }
    ]
  },
  access: {
    title: "Building Entrance & Parking",
    icon: <DoorOpen size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Separate Entrance", icon: "door-open", description: "Street or building entrance" },
      { name: "Private Entrance", icon: "key", description: "Your own private access" },
      { name: "Free Parking on Premises", icon: "car", description: "Convenient on-site parking" },
      { name: "Free On-Street Parking", icon: "car", description: "Available nearby" },
      { name: "Lift (Elevator)", icon: "door-open", description: "Easy access to all floors" }
    ]
  },
  internet: {
    title: "Internet & Office",
    icon: <Wifi size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "High-Speed WiFi", icon: "wifi", description: "Complimentary fast connection" },
      { name: "Dedicated Workspace", icon: "desk", description: "Comfortable area for working" }
    ]
  },
  kitchen: {
    title: "Kitchen & Dining",
    icon: <UtensilsCrossed size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Full Kitchen", icon: "kitchen", description: "Complete kitchen setup" },
      { name: "Refrigerator", icon: "fridge", description: "Spacious refrigerator" },
      { name: "Microwave", icon: "microwave", description: "Convenient for quick meals" },
      { name: "Cooking Basics", icon: "utensils", description: "Pots, pans, oil, salt, pepper" },
      { name: "Dishes & Cutlery", icon: "utensils", description: "Everything you need to dine in" },
      { name: "Freezer", icon: "freezer", description: "Large freezer space" },
      { name: "Induction Cooker", icon: "induction-cooker", description: "Modern cooking surface" },
      { name: "Kettle", icon: "kettle", description: "Electric kettle for hot beverages" },
      { name: "Waste Compactor", icon: "trash", description: "Modern waste management" },
      { name: "Coffee Maker", icon: "coffee", description: "For your morning brew" },
      { name: "Breakfast Included", icon: "coffee", description: "Any time breakfast" }
    ]
  },
  additional: {
    title: "Additional Amenities",
    icon: <KeySquare size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Gym Access", icon: "trash", description: "Cult Membership over 100's of gyms across Bangalore" }
    ]
  },
  climate: {
    title: "Heating & Cooling",
    icon: <Thermometer size={28} />,
    color: "bg-gradient-to-r from-[#0B3C49] to-[#0B3C49A3]",
    items: [
      { name: "Air Conditioning", icon: "thermometer", description: "Climate control throughout" },
      { name: "Ceiling Fan", icon: "thermometer", description: "Additional air circulation" }
    ]
  },
  // amenities:
  // items: [
  //   { label: "Queen-size bed", icon: "Bed" },
  //   { label: "Attached Kitchen", icon: "Utensils" },
  //   { label: "Living Room with balcony", icon: "Sofa" },
  // ],
};
