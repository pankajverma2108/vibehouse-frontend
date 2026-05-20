
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Users } from 'lucide-react';

interface BookingFormProps {
  selectedRoom?: string;
}

const BookingForm: React.FC<BookingFormProps> = ({ selectedRoom }) => {
  const [roomType, setRoomType] = useState(selectedRoom || '');

  // Update roomType when selectedRoom prop changes
  useEffect(() => {
    if (selectedRoom) {
      setRoomType(selectedRoom);
    }
  }, [selectedRoom]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 transform translate-y-[-50px] mx-4 md:mx-auto max-w-5xl z-30 relative">
      <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center">Find Your Perfect Room</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="check-in" className="flex items-center gap-2">
            <Calendar size={18} className="text-hotel-accent" />
            Check-in Date
          </Label>
          <Input 
            id="check-in" 
            type="date" 
            className="w-full border rounded-md p-2" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="check-out" className="flex items-center gap-2">
            <Calendar size={18} className="text-hotel-accent" />
            Check-out Date
          </Label>
          <Input 
            id="check-out" 
            type="date" 
            className="w-full border rounded-md p-2" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="room-type" className="flex items-center gap-2">
            <Users size={18} className="text-hotel-accent" />
            Room Type
          </Label>
          <select 
            id="room-type" 
            className="w-full border rounded-md p-2 h-10"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
          >
            <option value="">Select a room</option>
            <option value="Deluxe Suite">Deluxe Suite</option>
            <option value="Executive Room">Executive Room</option>
            <option value="Family Room">Family Room</option>
            <option value="Presidential Suite">Presidential Suite</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="guests" className="flex items-center gap-2">
            <Users size={18} className="text-hotel-accent" />
            Guests
          </Label>
          <select 
            id="guests" 
            className="w-full border rounded-md p-2 h-10"
          >
            <option value="1">1 Guest</option>
            <option value="2">2 Guests</option>
            <option value="3">3 Guests</option>
            <option value="4">4 Guests</option>
            <option value="more">5+ Guests</option>
          </select>
        </div>
        
        <div className="lg:col-span-4 mt-4">
          <Button className="hotel-button w-full">
            Search Availability
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
