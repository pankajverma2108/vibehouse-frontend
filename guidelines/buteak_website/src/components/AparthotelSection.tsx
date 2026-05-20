
import React from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Card, CardContent } from "@/components/ui/card";
import { Building } from 'lucide-react';

const AparthotelSection = () => {
  return (
    <section className="py-16 md:py-16 bg-[#faf7f2]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div className="space-y-6">
            <div className="mb-2 flex items-center">
              <span className="inline-block bg-hotel-accent h-1 w-16 mr-3"></span>
              <p className="text-hotel-accent font-medium uppercase tracking-wider">APARTHOTEL?</p>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-hotel-heading relative">
              <span className="relative inline-block">
                What is an
              </span>
              <br /> 
              <HoverCard>
                <HoverCardTrigger>
                  <span className="relative inline-block transition-colors hover:text-hotel-accent">
                    Aparthotel?
                    <span className="absolute -bottom-2 left-0 h-1 w-0 bg-hotel-accent group-hover:w-full transition-all duration-300"></span>
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="bg-white shadow-lg p-4">
                  <p className="text-sm text-hotel-body">
                    An aparthotel combines the best of apartments and hotels
                  </p>
                </HoverCardContent>
              </HoverCard>
            </h2>

            <div className="inline-block mt-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-hotel-accent bg-opacity-20 mb-4">
                <Building className="h-8 w-8 text-hotel-accent animate-pulse-custom" />
              </div>
            </div>
          </div>
          
          {/* <div className="space-y-6">
            <Card className="bg-white shadow-md hover:shadow-xl transition-all duration-300 border-none overflow-hidden">
              <CardContent className="p-6">
                <p className="text-hotel-body text-lg leading-relaxed mb-6 relative pl-4">
                  <span className="absolute top-0 left-0 h-full w-1 bg-hotel-accent"></span>
                  Discover Buteak Suites, where hotel hospitality meets the freedom of apartment living. Thoughtfully designed 
                  suites feature fully equipped kitchens, inviting living spaces, and premium amenities, offering a seamless 
                  blend of comfort and convenience.
                </p>
                
                <div className="mt-8 space-y-4">
                  <div className="bg-[#f4f1ea] p-4 rounded-lg transform hover:scale-105 transition-transform duration-300">
                    <p className="text-hotel-body">
                      <span className="font-semibold text-hotel-accent">Perfect for everyone</span> - Perfect for solo travelers, families, colleagues, or friends, our aparthotels deliver unmatched flexibility and attentive service, including anytime breakfast, early check-ins, regional cuisine, and in-room kettles. 
                    </p>
                  </div>
                  
                  <div className="bg-[#f4f1ea] p-4 rounded-lg transform hover:scale-105 transition-transform duration-300">
                    <p className="text-hotel-body">
                      <span className="font-semibold text-hotel-accent">Exclusive savings</span> - Ideal for short or long stays, enjoy exclusive savings: 20% off stays of 7-21 nights and 30% off stays over 21 nights. Whether for business or leisure, Buteak Suites ensures your stay feels truly like home.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default AparthotelSection;
