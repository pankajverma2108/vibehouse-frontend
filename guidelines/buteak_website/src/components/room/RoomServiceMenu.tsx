
import React from 'react';
import { Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const RoomServiceMenu: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-8 rounded-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop')] opacity-20 bg-cover bg-center"></div>
      <div className="relative z-10">
        <h3 className="text-2xl font-semibold mb-4">Room Service Menu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
              <Utensils size={18} className="text-hotel-accent" />
              Breakfast (6:30 AM - 11:00 AM)
            </h4>
            <ul className="space-y-3">
              <li className="flex justify-between">
                <span>Continental Breakfast</span>
                <span className="font-medium">₹28</span>
              </li>
              <li className="flex justify-between">
                <span>American Breakfast</span>
                <span className="font-medium">₹32</span>
              </li>
              <li className="flex justify-between">
                <span>Healthy Start</span>
                <span className="font-medium">₹26</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
              <Utensils size={18} className="text-hotel-accent" />
              All Day Dining (11:00 AM - 11:00 PM)
            </h4>
            <ul className="space-y-3">
              <li className="flex justify-between">
                <span>Signature Club Sandwich</span>
                <span className="font-medium">₹24</span>
              </li>
              <li className="flex justify-between">
                <span>Caesar Salad</span>
                <span className="font-medium">₹18</span>
              </li>
              <li className="flex justify-between">
                <span>Pasta of the Day</span>
                <span className="font-medium">₹26</span>
              </li>
            </ul>
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="link" className="text-hotel-primary mt-4 p-0">
                View Full Menu
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Full menu available in the room</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default RoomServiceMenu;
