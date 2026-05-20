
import React from 'react';
import { ExternalLink, Plane, Bus, Train } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TransportOption {
  type: 'airport' | 'train' | 'bus';
  name: string;
  distance: string;
  time: string;
}

interface NearbyPlace {
  category: string;
  count: number;
  icon: React.ReactNode;
}

interface HotelLocationProps {
  address: string;
  mapImageUrl?: string;
  transportOptions: TransportOption[];
  nearbyPlaces: NearbyPlace[];
}

const HotelLocation: React.FC<HotelLocationProps> = ({
  address,
  mapImageUrl,
  transportOptions,
  nearbyPlaces
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#d4a437] mb-6">Location</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-gray-500 text-[14px] mb-4">{address}</p>

          {/* <Button variant="outline" className="flex items-center gap-2 mb-8">
            <span className='text-gray-600 font-bold text-[16px]'>View on Maps</span>
            <ExternalLink size={16} />
          </Button> */}

          {/* Transportation options */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
            {transportOptions.map((option, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  {option.type === 'airport' && <Plane className="text-gray-500 " />}
                  {option.type === 'train' && <Train className="text-gray-500 " />}
                  {option.type === 'bus' && <Bus className="text-gray-500  " />}
                </div>
                <h4 className="font-bold text-sm">{option.name}</h4>
                <p className="text-gray-500 text-xs mt-1">{option.distance} • {option.time}</p>
              </div>
            ))}
          </div>

          {/* Nearby attractions */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {nearbyPlaces.map((place, index) => (
              <Card key={index} className="p-4 text-center hover:bg-gray-50 cursor-pointer">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 flex items-center justify-center text-hotel-accent mb-2">
                    {place.icon}
                  </div>
                  <h4 className="font-bold text-sm text-[#d4a437]">{place.category}</h4>
                  <p className="text-xs text-gray-500">{place.count} Nearby</p>
                  {/* <Button variant="link" size="sm" className="mt-2 p-0 h-auto">
                    View
                  </Button> */}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Map */}
        {/* <div className="bg-gray-100 rounded-lg overflow-hidden h-[300px]">
          {mapImageUrl ? (
            <img src={mapImageUrl} alt="Hotel location on map" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Click to view Map
            </div>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default HotelLocation;
