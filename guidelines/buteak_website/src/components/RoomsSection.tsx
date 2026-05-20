
// import React from 'react';
import RoomCard from '@/components/RoomCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { rooms } from '@/data/room/rooms';
const RoomsSection = () => {
  const displayRooms = rooms.slice(0, 3);
  // const rooms = [
  //   {
  //     id: "medium-suite",
  //     title: "Medium Suite",
  //     description: "Spacious room with a king-size bed, elegant furnishings, and a luxurious marble bathroom.",
  //     price: "₹299/night",
  //     image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop",
  //     amenities: ["King Bed", "City View", "42m²", "Minibar", "Smart TV"]
  //   },
  //   {
  //     id: "large-suites",
  //     title: "Large Suites",
  //     description: "Luxurious suite featuring a separate living area, premium amenities, and panoramic city views.",
  //     price: "₹499/night",
  //     image: "https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=2067&auto=format&fit=crop",
  //     amenities: ["King Bed", "Panoramic View", "65m²", "Jacuzzi", "Butler Service"]
  //   },
  //   // {
  //   //   title: "Executive Double Room",
  //   //   description: "Perfect for families or groups, featuring two queen beds and modern amenities for a comfortable stay.",
  //   //   price: "₹359/night",
  //   //   image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop",
  //   //   amenities: ["Two Queen Beds", "Pool View", "50m²", "Workspace", "Room Service"]
  //   // }
  // ];

  return (
    <section id="rooms" className="py-10 md:py-10 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Luxurious Rooms</h2>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>

          <p className="text-hotel-body max-w-2xl mx-auto">
            Experience the epitome of comfort and elegance in our meticulously designed accommodations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {displayRooms.map((room, index) => (
              <RoomCard
                key={index}
                id={room.id}
                title={room.title}
                description={room.description}
                // price={room.price}
                price={`${room.price}/night`}
                image={room.image}
                // amenities={room.amenities}
                amenities={room.amenities.slice(0, 5)}
              />
            ))}
          </div>
        </div>

        {/* <div className="text-center mt-12">
          <Button asChild variant="outline" className="border-hotel-accent text-hotel-accent hover:bg-hotel-accent/10">
            <Link to="/rooms">View All Rooms</Link>
          </Button>
        </div> */}
        <div className="text-center mt-12 space-x-4">
          <Button asChild variant="outline" className="border-hotel-accent text-hotel-accent hover:bg-hotel-accent/10">
            <Link to="/rooms">View All Rooms</Link>
          </Button>
          <Button asChild variant="outline" className="text-black">
            <Link to="/hotels">Explore Our Hotels</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RoomsSection;
