
import React from 'react';
import { Users, Hotel, WifiHigh, Clock } from 'lucide-react';

interface RoomDescriptionProps {
  description: string;
  maxGuests: number;
  size: string;
}

const RoomDescription: React.FC<RoomDescriptionProps> = ({ description, maxGuests, size }) => {
  return (
    <div className="space-y-6">
      <div>
        {/* <h3 className="text-2xl font-bold text-hotel-primary mb-4">Room Description</h3> */}
        {/* <p className="text-hotel-body text-gray-600 text-sm  leading-relaxed">{description}</p> */}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="flex flex-col items-center bg-gray-50 p-4 rounded-lg">
          <Users className="text-hotel-accent mb-2" size={24} />
          <span className="text-sm font-medium">Up to {maxGuests} guests</span>
        </div>
        <div className="flex flex-col items-center bg-gray-50 p-4 rounded-lg">
          <Hotel className="text-hotel-accent mb-2" size={24} />
          <span className="text-sm font-medium">{size}</span>
        </div>
        <div className="flex flex-col items-center bg-gray-50 p-4 rounded-lg">
          <WifiHigh className="text-hotel-accent mb-2" size={24} />
          <span className="text-sm font-medium">Free high-speed Wi-Fi</span>
        </div>
        <div className="flex flex-col items-center bg-gray-50 p-4 rounded-lg">
          <Clock className="text-hotel-accent mb-2" size={24} />
          <span className="text-sm font-medium">24/7 room service</span>
        </div>
      </div>
    </div>
  );
};

export default RoomDescription;
