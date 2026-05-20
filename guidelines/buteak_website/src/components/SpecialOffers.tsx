
// import React from 'react';
import OfferCard from '@/components/special-offers/OfferCard';
import { specialOffers } from '@/data/special-offers';

const SpecialOffers = () => {
  console.log('Special Offers:', specialOffers); // Add debug log to check data

  return (
    <section className="py-10 md:py-10 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Special Offers</h2>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>

          <p className="text-hotel-body max-w-2xl mx-auto">
            Enjoy exclusive deals and packages for an unforgettable stay
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {specialOffers && specialOffers.length > 0 ? (
            specialOffers.map((offer, index) => (
              <OfferCard key={index} {...offer} />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">No special offers available at the moment.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;
