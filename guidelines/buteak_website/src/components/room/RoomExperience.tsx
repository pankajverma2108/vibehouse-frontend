
import React from 'react';
import { Star } from 'lucide-react';

interface RoomExperienceProps {
  rating: number;
  reviews: number;
}

const RoomExperience: React.FC<RoomExperienceProps> = ({ rating, reviews }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-2xl font-semibold mb-6">Guest Experience</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xl font-bold">{rating}</span>
            </div>
            <div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500">Based on {reviews} verified reviews</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm">Cleanliness</span>
              <div className="flex-1 bg-gray-200 h-2 rounded-full">
                <div className="bg-hotel-accent h-full rounded-full" style={{ width: '95%' }} />
              </div>
              <span className="text-sm font-medium">9.5</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm">Comfort</span>
              <div className="flex-1 bg-gray-200 h-2 rounded-full">
                <div className="bg-hotel-accent h-full rounded-full" style={{ width: '90%' }} />
              </div>
              <span className="text-sm font-medium">9.0</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm">Location</span>
              <div className="flex-1 bg-gray-200 h-2 rounded-full">
                <div className="bg-hotel-accent h-full rounded-full" style={{ width: '98%' }} />
              </div>
              <span className="text-sm font-medium">9.8</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm">Service</span>
              <div className="flex-1 bg-gray-200 h-2 rounded-full">
                <div className="bg-hotel-accent h-full rounded-full" style={{ width: '92%' }} />
              </div>
              <span className="text-sm font-medium">9.2</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-sm">Value</span>
              <div className="flex-1 bg-gray-200 h-2 rounded-full">
                <div className="bg-hotel-accent h-full rounded-full" style={{ width: '88%' }} />
              </div>
              <span className="text-sm font-medium">8.8</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="border-l-4 border-hotel-accent pl-4 italic">
            <p className="text-gray-700">"Absolutely stunning room with incredible views. The staff was attentive and the amenities were top-notch. Would definitely stay here again!"</p>
            <p className="text-sm font-medium mt-2">- Jennifer T., New York</p>
          </div>
          <div className="border-l-4 border-hotel-accent pl-4 italic">
            <p className="text-gray-700">"The room exceeded our expectations. Luxurious, spacious, and the perfect place to relax after exploring the city."</p>
            <p className="text-sm font-medium mt-2">- Michael R., London</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomExperience;
