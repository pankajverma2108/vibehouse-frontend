
import React from 'react';
import { motion } from 'framer-motion';

const AmenitiesHero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-hotel-light to-white">
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute w-full h-full bg-[radial-gradient(#d4a437_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      </div>
      <div className="py-16 md:py-16 bg-hotel-primary text-white">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl md:text-5xl text-white font-schibsted leading-tight lg:text-6xl font-medium  mb-4
            font-schibsted text-5xl md:text-5xl lg:text-6xl  mb-4">
              Exceptional <span className="text-hotel-accent">Amenities</span>
            </h1>
            <div className="h-1 bg-hotel-accent mx-auto w-24 mb-8"></div>
            <p className="text-lg md:text-xl text-white mb-10">
              Experience unparalleled comfort and luxury with our comprehensive range of premium amenities designed to enhance your stay.
            </p>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default AmenitiesHero;
