
import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

interface HighlightItem {
  title: string;
  description: string;
  image: string;
}

interface HotelHighlightsCarouselProps {
  highlights: HighlightItem[];
}

const HotelHighlightsCarousel: React.FC<HotelHighlightsCarouselProps> = ({ highlights }) => {
  return (
    <div className="w-full">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {highlights.map((highlight, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card className="overflow-hidden border-none shadow-md">
                  <CardContent className="p-0">
                    <div className="relative">
                      <img 
                        src={highlight.image} 
                        alt={highlight.title} 
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-0 p-4 text-white">
                        <h3 className="font-semibold text-lg mb-1">{highlight.title}</h3>
                        <p className="text-sm text-white/90">{highlight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex justify-end gap-2 mt-4 pr-2">
          <CarouselPrevious className="static bg-white/80 hover:bg-white transform-none translate-y-0" />
          <CarouselNext className="static bg-white/80 hover:bg-white transform-none translate-y-0" />
        </div>
      </Carousel>
    </div>
  );
};

export default HotelHighlightsCarousel;
