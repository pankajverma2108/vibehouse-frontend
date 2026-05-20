
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoomDescription from './RoomDescription';
import RoomAmenities from './RoomAmenities';
import RoomPolicies from './RoomPolicies';
import { Room } from '@/types/room';

interface RoomDetailTabsProps {
  room: Room;
}

const RoomDetailTabs: React.FC<RoomDetailTabsProps> = ({ room }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-hotel-accent font-medium transition-all">Overview</TabsTrigger>
          <TabsTrigger value="amenities" className="data-[state=active]:bg-white data-[state=active]:text-hotel-accent font-medium transition-all">Amenities</TabsTrigger>
          {/* <TabsTrigger value="policies" className="data-[state=active]:bg-white data-[state=active]:text-hotel-accent font-medium transition-all">Policies</TabsTrigger> */}
        </TabsList>

        <TabsContent value="overview" className="focus:outline-none">
          <RoomDescription
            description={room.longDescription}
            maxGuests={room.maxGuests}
            size={room.amenities[2]}
          />
        </TabsContent>

        <TabsContent value="amenities" className="focus:outline-none">
          <RoomAmenities amenities={room.amenities} />
        </TabsContent>

        <TabsContent value="policies" className="focus:outline-none">
          <RoomPolicies />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoomDetailTabs;
