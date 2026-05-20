
import React from 'react';
import { Bed, WifiHigh, Tv, CreditCard, Clock, Hotel } from 'lucide-react';

import { AMENITIES } from '@/types/room';

interface CompProps {
  amenities: AMENITIES[];
}

const KeyAmenities: React.FC<CompProps> = ({ amenities }) => {
  console.log("amenities", amenities);
  return (
    <div className="mb-8">
      <h3 className="text-2xl font-bold text-hotel-primary mb-4">Key Amenities</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {amenities?.map((item, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 p-4 items-center justify-center bg-white rounded-md shadow-sm"
          >
            <div className="text-[#D4A437] flex ">
              {item.icon}
            </div>
            <span className="text-sm text-center font-medium">{item.label}</span>
          </div>
        ))}
      </div>
      {/* <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <Bed size={32} className="text-[#D4A437] mb-2" />
          <span className="text-sm font-medium">King-size Bed</span>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <WifiHigh size={32} className="text-[#D4A437] mb-2" />
          <span className="text-sm font-medium">Free Wi-Fi</span>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <Tv size={32} className="text-[#D4A437] mb-2" />
          <span className="text-sm font-medium">Smart TV</span>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <CreditCard size={32} className="text-[#D4A437] mb-2" />
          <span className="text-sm font-medium">Mini Bar</span>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <Clock size={32} className="text-[#D4A437] mb-2" />
          <span className="text-sm font-medium">24/7 Service</span>
        </div>
        <div className="flex flex-col items-center text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
          <Hotel size={32} className="text-[#D4A437] mb-2" />
          <span className="text-sm font-medium">Private Balcony</span>
        </div>
      </div> */}
    </div>
  );
};

export default KeyAmenities;
