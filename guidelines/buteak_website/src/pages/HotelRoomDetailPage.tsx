
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getRoom, getRoomsWithPrices } from '@/data/room/rooms';
import { Room } from '@/types/room';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import RoomGallery from '@/components/room/RoomGallery';
import RoomDetailTabs from '@/components/room/RoomDetailTabs';
import RoomBookingWidget from '@/components/room/RoomBookingWidget';
import KeyAmenities from '@/components/room/KeyAmenities';
import SimilarRooms from '@/components/room/SimilarRooms';

const HotelRoomDetailPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [guestCount, setGuestCount] = useState<string>("2");

    // Get room data with dynamic pricing
    const [room, setRoom] = useState<Room | null>(null);
    const [similarRooms, setSimilarRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);


    // Load room data and prices
    useEffect(() => {
        const loadRoomData = async () => {
            setLoading(true);
            try {
                const roomData = await getRoom(roomId || '');
                setRoom(roomData);
                
                const allRooms = await getRoomsWithPrices();
                setSimilarRooms(allRooms.filter(r => r.id !== roomId));
                

            } catch (error) {
                console.error('Failed to load room data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        loadRoomData();
    }, [roomId]);



    // Handle room selection
    const handleRoomSelect = (selectedRoomId: string) => {
        navigate(`/hotel-room/${selectedRoomId}`);
    };

    // Return to hotels page
    const handleBackToHotels = () => {
        navigate('/hotels');
    };

    // If room not found, redirect to first available room after a short delay
    useEffect(() => {
        if (!room && similarRooms.length > 0) {
            const timer = setTimeout(() => {
                navigate(`/hotel-room/${similarRooms[0].id}`);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [room, similarRooms, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="container mx-auto flex-1 flex items-center justify-center flex-col p-6">
                    <h1 className="text-2xl font-bold mb-4">Loading...</h1>
                </div>
                <Footer />
            </div>
        );
    }

    if (!room) {
        return (
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="container mx-auto flex-1 flex items-center justify-center flex-col p-6">
                    <h1 className="text-2xl font-bold mb-4">Room not found</h1>
                    <p className="mb-6">The room you are looking for does not exist.</p>
                    <Button onClick={handleBackToHotels}>
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
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 px-2 py-1"
                        onClick={handleBackToHotels}
                    >
                        <ArrowLeft size={16} /> Back to Hotels
                    </Button>
                    {/* <ArrowRight size={16} className="text-gray-400" />
                    <span className="text-gray-500">Bloom Hotel</span> */}
                    <ArrowRight size={16} className="text-gray-400" />
                    <span>{room.title}</span>
                </div>

                <Card className="mb-8 overflow-hidden">
                    <CardContent className="p-0">
                        {/* Room Header with Title, Price */}
                        <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">{room.title}</h1>
                                <div className="flex items-center mt-2">
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md font-medium">
                                        {room.rating} Rating
                                    </span>
                                    <span className="mx-2 text-gray-400">•</span>
                                    <span className="text-sm text-gray-600">{room.reviews} reviews</span>
                                </div>
                            </div>
                            <div className="mt-4 md:mt-0">
                                <span className="text-2xl font-bold">₹{room.price}</span>
                                {/* <span className="text-gray-600"> / night</span> */}
                            </div>
                        </div>

                        {/* Room Gallery */}
                        <RoomGallery
                            images={room.gallery}
                            title={room.title}
                        />
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Room Details */}
                    <div className="col-span-2 space-y-6">

                        {/* Room Details Tabs */}
                        {/* <RoomDetailTabs room={room} /> */}

                        {/* Key Amenities */}

                        <KeyAmenities amenities={room.amenities} />
                        <div className="mt-4 md:mt-0">
                            <span className="text-1xl text-hotel-primary font-medium"><span className='font-bold'>Ideal For :</span>  {room.idealFor}</span>
                            {/* <span className="text-gray-600"> / night</span> */}
                        </div>
                        {/* Similar Rooms */}
                        <SimilarRooms
                            currentRoomId={room.id}
                            rooms={similarRooms.slice(0, 3)}
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

export default HotelRoomDetailPage;
