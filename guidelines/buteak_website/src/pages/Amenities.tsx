
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AmenitiesDetailSection from '@/components/amenities/AmenitiesDetailSection'
import AmenitiesHero from '@/components/amenities/AmenitiesHero';

const Amenities = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      <AmenitiesHero />
      <AmenitiesDetailSection />

      <Footer />
    </div>
  );
};

export default Amenities;
