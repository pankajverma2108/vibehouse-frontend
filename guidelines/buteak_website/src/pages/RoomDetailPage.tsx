
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RoomHeader from '@/components/room/RoomHeader';
import RoomGallery from '@/components/room/RoomGallery';
import RoomDetailTabs from '@/components/room/RoomDetailTabs';
import RoomBookingWidget from '@/components/room/RoomBookingWidget';
import SimilarRooms from '@/components/room/SimilarRooms';
import KeyAmenities from '@/components/room/KeyAmenities';
import { getRoom, rooms } from '@/data/room/rooms';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const RoomDetailPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [guestCount, setGuestCount] = useState<string>("2");

    // Get room data
    const room = getRoom(roomId || '');

    // Get similar rooms - using ES module import instead of require
    const similarRooms = rooms.filter(r => r.id !== roomId);

    // Handle room selection
    const handleRoomSelect = (selectedRoomId: string) => {
        navigate(`/room/${selectedRoomId}`);
    };

    // If room not found, redirect to first available room after a short delay
    useEffect(() => {
        if (!room && rooms.length > 0) {
            const timer = setTimeout(() => {
                navigate(`/room/${rooms[0].id}`);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [room, navigate]);

    if (!room) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="container mx-auto flex-1 flex items-center justify-center flex-col p-6">
                    <h1 className="text-2xl font-bold mb-4">Room not found</h1>
                    <p className="mb-6">The room you are looking for does not exist.</p>
                    <Button onClick={() => navigate('/hotels')}>
                        Back to Hotels
                    </Button>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-6 text-sm">
                    <span className="text-gray-500">Hotels</span>
                    {/* <ArrowRight size={16} className="text-gray-400" />
                    <span className="text-gray-500">Bloom Hotel</span> */}
                    <ArrowRight size={16} className="text-gray-400" />
                    <span>{room.title}</span>
                </div>

                {/* Room Header with Title, Rating */}
                <RoomHeader
                    title={room.title}
                    rating={room.rating}
                    reviews={room.reviews}
                    isTopRated={room.rating >= 4.8}
                />

                {/* Room Gallery */}
                <RoomGallery
                    images={room.gallery}
                    title={room.title}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Room Details */}
                    <div className="col-span-2 space-y-6">
                        {/* Room Details Tabs */}
                        <RoomDetailTabs room={room} />

                        {/* Key Amenities */}
                        <KeyAmenities />

                        {/* Similar Rooms */}
                        <SimilarRooms
                            currentRoomId={room.id}
                            rooms={similarRooms}
                            onRoomSelect={handleRoomSelect}
                        />
                    </div>

                    {/* Right Column: Booking Widget */}
                    <div>
                        <RoomBookingWidget
                            roomId={room.id}
                            price={room.price}
                            priceModifiers={room.priceModifiers}
                            guestCount={guestCount}
                            maxGuests={room.maxGuests}
                        />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default RoomDetailPage;