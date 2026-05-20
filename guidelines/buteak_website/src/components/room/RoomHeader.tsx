
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star } from 'lucide-react';

interface RoomHeaderProps {
  title: string;
  rating: number;
  reviews: number;
  isTopRated: boolean;
}

const RoomHeader: React.FC<RoomHeaderProps> = ({ title, rating, reviews, isTopRated }) => {
  return (
    <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {isTopRated && (
            <Badge variant="success" className="text-xs font-medium">
              Top Rated
            </Badge>
          )}
          <h2 className="text-3xl font-bold font-schibsted">{title}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={16} className="text-hotel-accent" />
          <span>Premium Floor • Tower Wing</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-5 h-5 ${i < Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
              />
            ))}
          </div>
          <span className="text-lg font-medium">{rating}</span>
          <span className="text-gray-500">({reviews} reviews)</span>
        </div>
        <span className="text-sm text-gray-500 mt-1">Last booked: 3 hours ago</span>
      </div>
    </div>
  );
};

export default RoomHeader;
