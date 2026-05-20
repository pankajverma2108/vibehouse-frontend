
import React from 'react';
import { Bed, Hotel, Calendar, Map, Users, Star } from 'lucide-react';

interface AmenityProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const AmenityCard: React.FC<AmenityProps> = ({ title, description, icon }) => {
  return (
    <div className="hotel-card p-6 flex flex-col items-center text-center animate-float">
      <div className="text-hotel-accent mb-4">
        {icon}
      </div>
      <h2 className="font-schibsted text-xl font-semibold mb-2">{title}</h2>
      <p className="font-schibsted text-hotel-body">{description}</p>
    </div>
  );
};

const AmenitiesSection = () => {
  const amenities = [
    {
      title: "Luxurious Rooms",
      description: "Experience ultimate comfort in our elegantly designed rooms with premium bedding.",
      icon: <Bed size={36} />
    },
    {
      title: "Exclusive Spa",
      description: "Rejuvenate your senses with our world-class spa treatments and therapies.",
      icon: <Hotel size={36} />
    },
    {
      title: "24/7 Concierge",
      description: "Our dedicated staff is available around the clock to assist with all your needs.",
      icon: <Users size={36} />
    },
    {
      title: "Prime Location",
      description: "Situated in the heart of the city with easy access to major attractions.",
      icon: <Map size={36} />
    },
    {
      title: "Fine Dining",
      description: "Indulge in culinary delights at our award-winning restaurants and bars.",
      icon: <Star size={36} />
    },
    {
      title: "Event Spaces",
      description: "Host memorable events in our versatile and sophisticated venues.",
      icon: <Calendar size={36} />
    }
  ];

  return (
    <section id="amenities" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Hotel Amenities</h2>
          <p className="text-hotel-body max-w-2xl mx-auto">
            Elevate your stay with our premium amenities designed to provide unparalleled comfort and convenience.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {amenities.map((amenity, index) => (
            <AmenityCard 
              key={index}
              title={amenity.title}
              description={amenity.description}
              icon={amenity.icon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AmenitiesSection;
