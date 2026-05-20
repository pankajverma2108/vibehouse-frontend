
import React from 'react';

const WelcomeSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto">
        <div className="text-center max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What is an Aparthotel?</h2>
            <div className="w-24 h-1 mb-4 bg-hotel-accent mx-auto"></div>
              <p className="text-hotel-body text-lg mb-8">
                Discover <span className="font-bold">Buteak Suites</span>, where hotel hospitality meets the freedom of apartment living. 
                Thoughtfully designed suites feature fully equipped kitchens, inviting living spaces, and premium amenities, offering a seamless blend of comfort and convenience. 
                Perfect for solo travelers, families, colleagues, or friends, our aparthotels deliver unmatched flexibility and attentive service, including anytime breakfast, early check-ins, regional cuisine, and in-room kettles. 
                Ideal for short or long stays, enjoy exclusive savings: 20% off stays of 7-21 nights and 30% off stays over 21 nights. Whether for business or leisure, Buteak Suites ensures your stay feels truly like home.
              </p>
     
        </div>
      </div>
    </section>
  );
};

export default WelcomeSection;
