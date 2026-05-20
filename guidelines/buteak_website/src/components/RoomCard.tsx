
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { InfoIcon } from 'lucide-react';

interface RoomCardProps {
  id?: string;
  title: string;
  description: string;
  price: string;
  image: string;
  amenities: string[];
}

const RoomCard: React.FC<RoomCardProps> = ({ id = '', title, description, price, image, amenities }) => {
  // Create a URL-friendly ID from title if no ID is provided

  const roomId = id || title.toLowerCase().replace(/\s+/g, '-');
  const navigate = useNavigate();

  // Handle View Details click - navigate to hotel room detail page
  const handleViewDetails = () => {
    navigate(`/hotel-room/${roomId}`);
  };


  // Handle View Details click - manually scroll to top
  // const handleViewDetails = () => {
  //   console.log('View Details clicked - scrolling to top');
  //   // Force immediate scroll to top to ensure it happens
  //   window.scrollTo(0, 0);
  //   setTimeout(() => {
  //     window.scrollTo({ top: 0, behavior: 'smooth' });
  //   }, 100);
  // };

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-lg transition-transform hover:shadow-xl">
      <div className="relative h-64 w-full overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <span className="text-hotel-accent font-bold">{price}</span>
        </div>
        <p className="mb-6 text-hotel-body">{description}</p>
        <div className="mb-6">
          <h4 className="mb-2 text-sm font-medium text-gray-600">Room Features</h4>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity, index) => (
              <span key={index} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                {amenity}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1 flex items-center gap-2">
            <Link to={`/rooms?room=${roomId}`} onClick={handleViewDetails}>
              <InfoIcon size={16} className="mr-1" /> View Details
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/hotel-room/${roomId}`}>Book Now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
