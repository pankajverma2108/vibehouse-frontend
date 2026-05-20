
import React from 'react';
import { Cigarette, PawPrint, Clock, Ban } from 'lucide-react';

const PropertyRules: React.FC = () => {
  return (
    <div className="bg-gray-50 p-6 rounded-lg">
      <h3 className="text-2xl font-semibold mb-4">Property Rules</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 rounded-full bg-red-100">
              <Cigarette className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h4 className="font-medium">No Smoking</h4>
              <p className="text-sm text-gray-600">Smoking is not permitted inside rooms</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 rounded-full bg-red-100">
              <PawPrint className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h4 className="font-medium">No Pets Allowed</h4>
              <p className="text-sm text-gray-600">Pets are not permitted in this property</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 rounded-full bg-blue-100">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium">Check-in & Check-out</h4>
              <p className="text-sm text-gray-600">Check-in: 2:00 PM | Check-out: 11:00 AM</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 rounded-full bg-blue-100">
              <Ban className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium">Cancellation Policy</h4>
              <p className="text-sm text-gray-600">Free cancellation up to 48 hours before arrival</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyRules;
