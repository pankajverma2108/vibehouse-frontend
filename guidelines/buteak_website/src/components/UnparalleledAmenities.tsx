
import React, { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';

const UnparalleledAmenities = () => {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (parallaxRef.current) {
        const scrollPosition = window.scrollY;
        const offset = scrollPosition * 0.2; // Adjust the parallax effect speed
        parallaxRef.current.style.transform = `translateY(-${offset}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/lovable-uploads/268dca0e-3c6a-4c0f-b835-68814f490614.png')] bg-cover bg-center" ref={parallaxRef}></div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row-reverse gap-10 items-center">
          {/* Image Column - with floating animation */}
          <div className="w-full lg:w-1/2 animate-float">
            <div className="relative rounded-xl overflow-hidden shadow-2xl transform transition-transform hover:scale-[1.02] duration-700">
              <img 
                src="/lovable-uploads/268dca0e-3c6a-4c0f-b835-68814f490614.png"
                alt="Luxurious hotel room" 
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <p className="text-sm font-medium uppercase tracking-wider mb-2 text-hotel-accent">Luxury Experience</p>
                <h3 className="text-2xl font-bold">Premium Amenities</h3>
              </div>
            </div>
          </div>
          
          {/* Text Column - with fade-in animation */}
          <div className="w-full lg:w-1/2 animate-fade-in">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-playfair font-bold mb-4">
                Unparalleled <span className="text-hotel-primary">Amenities</span>
              </h2>
              <div className="w-16 h-1 bg-hotel-accent mb-6"></div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-hotel-primary">
                <h3 className="text-xl font-bold mb-3 text-hotel-heading">Complimentary Breakfast</h3>
                <p className="text-hotel-body">
                  Start your day with our gourmet breakfast featuring locally sourced ingredients, 
                  freshly baked pastries, and premium coffee. Available from 6:30 AM to 10:30 AM daily.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-hotel-accent">
                <h3 className="text-xl font-bold mb-3 text-hotel-heading">High-Speed WiFi</h3>
                <p className="text-hotel-body">
                  Stay connected with complimentary high-speed wireless internet access throughout 
                  the property, perfect for both business and leisure travelers.
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border-l-4 border-hotel-primary">
                <h3 className="text-xl font-bold mb-3 text-hotel-heading">Wellness Facilities</h3>
                <p className="text-hotel-body">
                  Enjoy our state-of-the-art fitness center, spa treatments, and swimming pool 
                  designed to provide relaxation and rejuvenation during your stay.
                </p>
              </div>
              
              <div className="mt-6">
                <a href="/amenities" className="inline-flex items-center text-hotel-primary font-medium hover:text-hotel-accent transition-colors duration-200 group">
                  Discover all amenities
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UnparalleledAmenities;
