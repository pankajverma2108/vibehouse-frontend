
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { Calendar, Check } from 'lucide-react';
import { Label } from "@/components/ui/label";

interface RoomBookingWidgetProps {
  roomId: string;
  price: number;
  priceModifiers: Record<string, number>;
  guestCount: string;
  maxGuests: number;
}

const RoomBookingWidget: React.FC<RoomBookingWidgetProps> = ({
  roomId,
  price,
  priceModifiers,
  guestCount,
  maxGuests
}) => {
  const calculatePrice = (basePrice: number, modifiers: Record<string, number>, guests: string) => {
    return parseFloat((basePrice * (modifiers[guests] || modifiers['more'])).toFixed(2));
  };
  const phoneNumber = '+91 9993177238';
  const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

  const handleWhatsAppClick = () => {
    window.open(`https://live.ipms247.com/booking/book-rooms-buteaksuites-lf`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4 border border-gray-100 sticky top-4">
        <div className="space-y-2">
          <h3 onClick={handleWhatsAppClick} className="text-2xl font-bold text-hotel-primary">Book This Room</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-hotel-primary">
              ₹{calculatePrice(price, priceModifiers, guestCount).toFixed(2)}
            </span>
            {/* <span className="text-gray-500 ml-2">per night</span> */}
          </div>

          {Number(guestCount) > maxGuests && (
            <Badge variant="destructive" className="mt-2">
              Exceeds recommended capacity of {maxGuests} guests
            </Badge>
          )}
        </div>

        {/* <div className="pt-4 border-t border-gray-200 space-y-4">
          <div className="flex justify-between">
            <span>Base rate</span>
            <span>₹{price}</span>
          </div>
          <div className="flex justify-between">
            <span>Guest adjustment ({guestCount} {Number(guestCount) === 1 ? 'guest' : 'guests'})</span>
            <span>
              {priceModifiers[guestCount] > 1 ? '+' : ''}
              {Math.round((priceModifiers[guestCount] - 1) * 100)}%
            </span>
          </div>
          
          <div className="flex gap-2 bg-gray-50 p-3 rounded-md">
            <Calendar size={18} className="text-hotel-accent mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Check availability</p>
              <p className="text-xs text-gray-600">Select your dates to see accurate pricing</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="check-in-date">Check-in</Label>
              <div className="relative">
                <input
                  type="date"
                  id="check-in-date"
                  className="w-full border rounded-md p-2 pl-8"
                />
                <Calendar size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <Label htmlFor="check-out-date">Check-out</Label>
              <div className="relative">
                <input
                  type="date"
                  id="check-out-date"
                  className="w-full border rounded-md p-2 pl-8"
                />
                <Calendar size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
         */}
        <Button onClick={handleWhatsAppClick} className="w-full hotel-button mt-4">
          {/* <Link to={`/book-now?room=${roomId}`}> */}
          Book Now
          {/* </Link> */}
        </Button>

        <div className="space-y-2 mt-4">
          <div className="flex items-start gap-2">
            <Check size={16} className="text-green-500 mt-1 flex-shrink-0" />
            <span className="text-sm">Free cancellation up to 48 hours before check-in</span>
          </div>
          <div className="flex items-start gap-2">
            <Check size={16} className="text-green-500 mt-1 flex-shrink-0" />
            <span className="text-sm">No payment needed today</span>
          </div>
          <div className="flex items-start gap-2">
            <Check size={16} className="text-green-500 mt-1 flex-shrink-0" />
            <span className="text-sm">Pay at the hotel</span>
          </div>
        </div>

        {/* <div className="text-center mt-4">
          <p className="text-sm text-gray-500">Not ready to book?</p>
          <Button variant="link" className="text-hotel-primary p-0">
            Save to favorites
          </Button>
        </div> */}
      </div>

      {/* <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Room Availability Calendar</h3>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Check the calendar for real-time availability</p>
          <Button variant="outline" className="mt-3 text-sm">
            View Calendar
          </Button>
        </div>
      </div> */}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Need Help?</h3>
        <p className="text-sm text-gray-600 mb-3">Have questions or need assistance with your booking?</p>
        <Button variant="outline" className="w-full text-sm">
          Contact Reservation Team
        </Button>
      </div>
    </div>
  );
};

export default RoomBookingWidget;
