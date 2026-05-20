import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

interface LocationCardProps {
  name: string;
  city: string;
  image: string;
  to: string;
}

const LocationCard = ({ name, city, image, to }: LocationCardProps) => {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md  transition-all duration-300 transform hover:scale-105">
      <Link to={to} className="block">
        <div className="aspect-square overflow-hidden">
          <img
            src={image}
            alt={`${name}, ${city}`}
            className="w-full h-full object-cover transition-transform duration-500"
          />
        </div>
        <div className="p-4 text-center">
          <h3 className="text-xl font-semibold hover:text-hotel-accent transition-colors">{name}</h3>
          <p className="flex items-center justify-center gap-1 text-hotel-body mt-1">
            <MapPin className="h-4 w-4" />
            <span>{city}</span>
          </p>
        </div>
      </Link>
    </div>
  );
};

const LocationsSection = () => {
  const locations = [
    {
      name: "BTM Layout",
      city: "Bangalore",
      image: "images/location/bellandur.png",
      to: "/locations/btm-layout"
    },
    {
      name: "HSR Layout",
      city: "Bangalore",
      image: "images/location/hsr-layout.png",
      to: "/locations/hsr-layout"
    },
    {
      name: "Koramangala",
      city: "Bangalore",
      image: "images/location/koramangal.png",
      to: "/locations/koramangala"
    },
    {
      name: "Indira Nagar",
      city: "Bangalore",
      image: "images/location/indira-nagar.png",
      to: "/locations/indira-nagar.png"
    }
  ];

  return (
    <section className="pb-10 pt-14 md:py-24 bg-[#faf7f2]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-8 md:mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Buteak Suites Locations</h2>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-2"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {locations.map((location, index) => (
            <LocationCard
              key={index}
              name={location.name}
              city={location.city}
              image={location.image}
              to={location.to}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
