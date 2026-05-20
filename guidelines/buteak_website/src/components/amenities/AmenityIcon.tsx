
import React from 'react';
import { 
  Bath, 
  Wind, 
  Droplets, 
  Waves, 
  Thermometer, 
  Droplet,
  WashingMachine,
  Shirt,
  Bed,
  Blinds,
  Hammer,
  Shell,
  Bookmark,
  Tv,
  Shield,
  Heart,
  DoorOpen,
  Key,
  Car,
  Wifi,
  MonitorSmartphone,
  UtensilsCrossed,
  Refrigerator,
  Sandwich,
  Utensils,
  Snowflake,
  Flame,
  Coffee,
  Trash,
  Sofa,
  FireExtinguisher,
  Luggage,
  Building,
  TentTree
} from 'lucide-react';

interface AmenityIconProps {
  iconName: string;
  size?: number;
}

const AmenityIcon: React.FC<AmenityIconProps> = ({ iconName, size = 24 }) => {
  const iconProps = { size, color: '#d4a437' };

  // Map icon names to Lucide components
  switch (iconName) {
    // Bathroom
    case 'shower': return <Bath {...iconProps} />;
    case 'hairdryer': return <Wind {...iconProps} />;
    case 'spray-can': return <Droplets {...iconProps} />; // Changed from Spray to Droplets
    case 'shampoo': return <Droplets {...iconProps} />;
    case 'soap': return <Droplet {...iconProps} />;
    case 'bidet': return <Waves {...iconProps} />; // Changed from Bidet to Waves
    case 'thermometer': return <Thermometer {...iconProps} />;
    case 'shower-head': return <Droplet {...iconProps} />;
    
    // Bedroom & Laundry
    case 'washing-machine': return <WashingMachine {...iconProps} />;
    case 'hanger': return <Shirt {...iconProps} />;
    case 'bed': return <Bed {...iconProps} />;
    case 'blinds': return <Blinds {...iconProps} />;
    case 'iron': return <Hammer {...iconProps} />;
    case 'drying-rack': return <Shell {...iconProps} />;
    case 'wardrobe': return <Bookmark {...iconProps} />;
    
    // Entertainment
    case 'tv': return <Tv {...iconProps} />;
    
    // Safety
    case 'security-camera': return <Shield {...iconProps} />;
    case 'first-aid-kit': return <Heart {...iconProps} />;
    
    // Access
    case 'door-open': return <DoorOpen {...iconProps} />;
    case 'key': return <Key {...iconProps} />;
    case 'car': return <Car {...iconProps} />;
    
    // Internet & Office
    case 'wifi': return <Wifi {...iconProps} />;
    case 'desk': return <MonitorSmartphone {...iconProps} />;
    
    // Kitchen & Dining
    case 'kitchen': return <UtensilsCrossed {...iconProps} />;
    case 'fridge': return <Refrigerator {...iconProps} />;
    case 'microwave': return <Sandwich {...iconProps} />;
    case 'utensils': return <Utensils {...iconProps} />;
    case 'freezer': return <Snowflake {...iconProps} />;
    case 'induction-cooker': return <Flame {...iconProps} />;
    case 'kettle': return <Coffee {...iconProps} />;
    case 'trash': return <Trash {...iconProps} />;
    case 'coffee': return <Coffee {...iconProps} />;
    
    // Outdoor Features
    case 'balcony': return <TentTree {...iconProps} />; // Changed from Balcony to TentTree
    
    // Services
    case 'suitcase': return <Luggage {...iconProps} />; // Changed from Suitcase to Luggage
    case 'sofa': return <Sofa {...iconProps} />;
    case 'fire-extinguisher': return <FireExtinguisher {...iconProps} />;
    
    default: return <DoorOpen {...iconProps} />; // Default fallback icon
  }
};

export default AmenityIcon;
