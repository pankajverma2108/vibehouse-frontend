
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { Room } from '@/types/room';

interface SimilarRoomsProps {
  rooms: Room[];
  currentRoomId: string;
  onRoomSelect: (roomId: string) => void;
}

const SimilarRooms: React.FC<SimilarRoomsProps> = ({ rooms, currentRoomId, onRoomSelect }) => {
  // Handle room selection with scrolling to top, same as "View Details"
  const handleRoomSelect = (roomId: string) => {
    // Update the URL without navigating
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
    
    console.log('Similar room selected - scrolling to top');
    
    // Force immediate scroll to top to ensure it happens, same as View Details
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
    
    // Call the parent's onRoomSelect
    onRoomSelect(roomId);
  };

  return (
    <div className="bg-gray-50 p-8 rounded-lg">
      <h3 className="text-2xl font-semibold mb-6 text-center">You Might Also Like</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {rooms.filter(room => room.id !== currentRoomId)
          .slice(0, 3)
          .map((room) => (
            <div 
              key={room.id} 
              className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleRoomSelect(room.id)}
            >
              <div className="relative">
                <img 
                  src={room.image} 
                  alt={room.title} 
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge variant="success" className="bg-white text-hotel-primary">
                    From ₹{room.price}/night
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-lg">{room.title}</h4>
                <div className="flex items-center mt-1 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Star size={14} className="text-yellow-400 fill-yellow-400 mr-1" />
                    {room.rating}
                  </span>
                  <span className="mx-2">•</span>
                  <span>Up to {room.maxGuests} guests</span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default SimilarRooms;
