
import React from 'react';
import { Check } from 'lucide-react';

interface RoomAmenitiesProps {
  amenities: string[];
}

const RoomAmenities: React.FC<RoomAmenitiesProps> = ({ amenities }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-hotel-primary">Room Amenities</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h4 className="font-semibold text-hotel-primary text-lg">Bedroom</h4>
          <ul className="space-y-2">
            {amenities.slice(0, 4).map((amenity, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check className="text-hotel-accent" size={18} />
                <span className='text-gray-600 text-sm'>{amenity}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold text-hotel-primary text-lg">Entertainment</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>Smart TV with streaming</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>High-speed Internet</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>Bluetooth speaker system</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>International TV channels</span>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold text-hotel-primary text-lg">Bathroom</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>Luxury toiletries</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>Hairdryer</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>Bathrobes and slippers</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="text-hotel-accent" size={18} />
              <span className='text-gray-600 text-sm'>Separate shower and tub</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomAmenities;
