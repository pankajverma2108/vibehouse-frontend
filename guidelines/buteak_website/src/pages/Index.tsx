
// import React from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import TestimonialSection from '@/components/TestimonialSection';
import LocationsSection from '@/components/LocationsSection';
import WhyChooseUsSection from '@/components/WhyChooseUsSection';
import RoomsSection from '@/components/RoomsSection';
import SpecialOffers from '@/components/SpecialOffers';
import GallerySection from '@/components/GallerySection';
import UpcomingLocationsSection from '@/components/UpcomingLocationsSection';
import AparthotelSection from '@/components/AparthotelSection';
import LuxuryAmenitiesShowcase from '@/components/LuxuryAmenitiesShowcase';
import LocationSlider from '@/components/LocationSlider/LocationSlider';
import NewComponent from './NewComponent';
const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      {/* <NewComponent /> */}
      {/* What is an Aparthotel Section */}
      {/* <AparthotelSection /> */}

      {/* Locations Section */}
      {/* <LocationsSection /> */}
      <LocationSlider />

      {/* Why Choose Us Section */}
      <WhyChooseUsSection />

      {/* Amenities Section */}
      <LuxuryAmenitiesShowcase />

      {/* Special Offers Section */}
      <SpecialOffers />

      {/* Rooms Section */}
      {/* <RoomsSection /> */}

      {/* Upcoming Locations Section */}
      {/* <UpcomingLocationsSection /> */}

      {/* Gallery Section */}
      {/* <GallerySection /> */}

      {/* Testimonials Section */}
      <TestimonialSection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
