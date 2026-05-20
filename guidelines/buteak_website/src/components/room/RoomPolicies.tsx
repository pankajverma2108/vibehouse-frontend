
import React from 'react';
import { Check } from 'lucide-react';

const RoomPolicies: React.FC = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold mb-4">Room Policies</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-lg mb-2">Check-in & Check-out</h4>
            <div className="flex flex-col gap-1 text-gray-700">
              <div className="flex justify-between">
                <span>Check-in time</span>
                <span className="font-medium">2:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out time</span>
                <span className="font-medium">12:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Early check-in</span>
                <span className="font-medium">Subject to availability</span>
              </div>
              <div className="flex justify-between">
                <span>Late check-out</span>
                <span className="font-medium">Additional charges apply</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-2">Cancellation Policy</h4>
            <p className="text-gray-700">Free cancellation up to 48 hours before check-in. Cancellations made within 48 hours of check-in will be charged the first night's rate.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-lg mb-2">Additional Information</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="text-hotel-accent mt-1 flex-shrink-0" size={18} />
                <span className="text-gray-700">Pets are not allowed in the hotel rooms.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="text-hotel-accent mt-1 flex-shrink-0" size={18} />
                <span className="text-gray-700">The entire hotel is non-smoking. Designated smoking areas are available.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="text-hotel-accent mt-1 flex-shrink-0" size={18} />
                <span className="text-gray-700">Extra beds are available for an additional charge of $50 per night.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="text-hotel-accent mt-1 flex-shrink-0" size={18} />
                <span className="text-gray-700">Children under 12 years stay free when using existing bedding.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPolicies;
