
import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation } from 'lucide-react';

interface UpcomingLocationProps {
  city: string;
  image: string;
  launchDate: string;
}

const UpcomingLocationCard = ({ city, image, launchDate }: UpcomingLocationProps) => {
  return (
    <div className="relative group overflow-hidden rounded-lg">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={`Coming soon to ${city}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30 flex flex-col items-center justify-end p-6 text-white">
          <h3 className="text-xl text-white md:text-2xl font-bold mb-2">{city}</h3>
          <div className="flex items-center gap-2 text-sm md:text-base mb-3">
            {/* <Navigation className="h-4 w-4" /> */}
            {/* <span>Launching {launchDate}</span> */}
          </div>
          <div className="inline-block  py-2 hotel-button text-lg font-medium">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};

const UpcomingLocationsSection = () => {
  const upcomingLocations = [
    {
      city: "Mumbai",
      image: "images/upcoming-locations/mumbai.png",
      launchDate: "December 2025"
    },
    {
      city: "Delhi",
      image: "images/upcoming-locations/delhi.png",
      launchDate: "February 2026"
    },
    {
      city: "Hyderabad",
      image: "/images/upcoming-locations/hyderabad.png",
      launchDate: "April 2026"
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-[#f5f3ee]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Coming Soon to New Cities</h2>
          <p className="text-hotel-body max-w-2xl mx-auto">
            We're expanding our premium serviced apartments to more locations across India
          </p>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mt-6 mb-8"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upcomingLocations.map((location, index) => (
            <UpcomingLocationCard
              key={index}
              city={location.city}
              image={location.image}
              launchDate={location.launchDate}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default UpcomingLocationsSection;
