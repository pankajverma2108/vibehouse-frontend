
// import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const GallerySection = () => {
  return (
    <section id="gallery" className="py-10 md:py-10 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Gallery</h2>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>

          <p className="text-hotel-body max-w-2xl mx-auto">
            Take a visual journey through our elegant spaces and breathtaking views.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/bedroom.jpg"
              alt="Hotel Lobby"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/large-bedroom.jpg"
              alt="Hotel Room"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/large-cubord.jpg"
              alt="Hotel Restaurant"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/kitchen.jpg"
              alt="Hotel Pool"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/large-sofa.jpg"
              alt="Hotel Spa"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/sofa.jpg"
              alt="Hotel View"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/washroom.jpg"
              alt="Hotel Bar"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <div className="aspect-square overflow-hidden rounded-lg">
            <img
              src="/images/room/large-kitchen.jpg"
              alt="Hotel Gym"
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
        </div>

        <div className="text-center mt-12">
          <Button asChild variant="outline" className="border-hotel-accent text-hotel-accent hover:bg-hotel-accent/10">
            <Link to="/gallery">View Full Gallery</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
