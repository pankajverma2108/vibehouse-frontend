import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoomCard from '@/components/RoomCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from 'react-router-dom';

// Import room components
import RoomGallery from '@/components/room/RoomGallery';
import KeyAmenities from '@/components/room/KeyAmenities';
import PropertyRules from '@/components/room/PropertyRules';
import RoomHeader from '@/components/room/RoomHeader';
import RoomDetailTabs from '@/components/room/RoomDetailTabs';
import RoomExperience from '@/components/room/RoomExperience';
import RoomServiceMenu from '@/components/room/RoomServiceMenu';
import RoomBookingWidget from '@/components/room/RoomBookingWidget';
import SimilarRooms from '@/components/room/SimilarRooms';

// Import room data
import { rooms, getRoom } from '@/data/room/rooms';

const Rooms = () => {
  const [searchParams] = useSearchParams();
  const roomIdParam = searchParams.get('room');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(roomIdParam);
  const [guestCount, setGuestCount] = useState<string>("2");
  const isFromSimilarRooms = useRef(false);

  const currentRoom = selectedRoom ? getRoom(selectedRoom) : null;

  // Custom room selection handler
  const handleRoomSelect = (roomId: string) => {
    // If it's from similar rooms, disable scrolling
    isFromSimilarRooms.current = true;
    setSelectedRoom(roomId);
  };

  // Update selectedRoom when URL parameter changes
  useEffect(() => {
    if (roomIdParam !== selectedRoom) {
      setSelectedRoom(roomIdParam);
      // If URL changed but not from SimilarRooms component, reset the flag
      if (!isFromSimilarRooms.current) {
        console.log("URL changed - scrolling to top");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [roomIdParam, selectedRoom]);

  // Scroll to top when a room is selected, but not from Similar Rooms
  useEffect(() => {
    if (selectedRoom && !isFromSimilarRooms.current) {
      console.log("Room selected - scrolling to top");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Reset the flag for future selections
    isFromSimilarRooms.current = false;
  }, [selectedRoom]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="font-schibsted text-5xl md:text-5xl lg:text-6xl xl:text-[80px] font-medium leading-tight mb-4">Our Luxurious Rooms </h1>
            <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
            <p className="text-hotel-body max-w-2xl mx-auto">
              Experience the epitome of comfort and elegance in our meticulously designed accommodations.
            </p>
          </div>

          {!selectedRoom ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  id={room.id}
                  title={room.title}
                  description={room.description}
                  price={`₹${room.price}/night`}
                  image={room.image}
                  amenities={room.amenities.slice(0, 5)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRoom(null)}
                >
                  Back to All Rooms
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-hotel-body font-medium">Guest Count:</span>
                  <Select value={guestCount} onValueChange={setGuestCount}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Select guests" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Guest</SelectItem>
                      <SelectItem value="2">2 Guests</SelectItem>
                      <SelectItem value="3">3 Guests</SelectItem>
                      <SelectItem value="4">4 Guests</SelectItem>
                      <SelectItem value="more">5+ Guests</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {currentRoom && (
                <div className="space-y-12">
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <RoomHeader
                      title={currentRoom.title}
                      rating={currentRoom.rating}
                      reviews={currentRoom.reviews}
                      isTopRated={currentRoom.rating >= 4.8}
                    />

                    <RoomGallery
                      images={currentRoom.gallery}
                      title={currentRoom.title}
                    />

                    <div className="mb-8">
                      <h3 className="text-2xl font-semibold mb-3">Room Description</h3>
                      <p className="text-hotel-body leading-relaxed">{currentRoom.longDescription}</p>
                    </div>

                    <KeyAmenities />

                    <PropertyRules />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <RoomDetailTabs room={currentRoom} />

                      <RoomExperience
                        rating={currentRoom.rating}
                        reviews={currentRoom.reviews}
                      />

                      <RoomServiceMenu />
                    </div>

                    <RoomBookingWidget
                      roomId={currentRoom.id}
                      price={currentRoom.price}
                      priceModifiers={currentRoom.priceModifiers}
                      guestCount={guestCount}
                      maxGuests={currentRoom.maxGuests}
                    />
                  </div>

                  <SimilarRooms
                    rooms={rooms}
                    currentRoomId={currentRoom.id}
                    onRoomSelect={handleRoomSelect}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Rooms;
