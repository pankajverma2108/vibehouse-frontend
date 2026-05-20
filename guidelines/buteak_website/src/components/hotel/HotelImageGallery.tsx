
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface HotelImageGalleryProps {
  images: string[];
  title: string;
  rating?: number;
  location?: string;
  price?: number;
}

const HotelImageGallery: React.FC<HotelImageGalleryProps> = ({
  images,
  title,
  rating,
  location,
  price
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const selectImage = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative">
      {/* Main image display with full width */}
      <div className="">
        {/* <img
          src={images[currentIndex]}
          alt={`${title} - ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        /> */}

        {/* Navigation buttons */}
        {/* <Button
          onClick={prevImage}
          size="icon"
          variant="outline"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/50 hover:bg-white/80 text-black"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={nextImage}
          size="icon"
          variant="outline"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/50 hover:bg-white/80 text-black"
        >
          <ChevronRight className="h-4 w-4" />
        </Button> */}

        {/* View all images button */}
        {/* <Button
          onClick={() => setShowAllImages(true)}
          className="absolute bottom-20 right-4 bg-white/80 hover:bg-white text-black"
          size="sm"
        >
          View All Images
        </Button> */}

        {/* Yellow banner at bottom with hotel name and rating */}
        <div className="bg-hotel-primary py-16 md:py-20 px-4 md:px-0">
          <div className="container mx-auto px-4 md:px-6 max-w-7xl">
            <h1 className="text-2xl md:text-5xl font-semibold text-white mb-1">{title}</h1>

            <div className="flex flex-col md:flex-row md:justify-between md:items-end">
              <div>
                {price && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-white font-bold text-xl">₹ {price}</span>
                    <span className="text-white text-sm">/ night onwards</span>
                  </div>
                )}
                {/* <p className="text-white text-sm">Incl. taxes</p> */}
              </div>

              {rating && (
                <div className="flex items-center gap-1 mt-2 md:mt-0">
                  <div className="flex items-center gap-1 bg-white text-black font-bold px-2 py-1 rounded">
                    <Star size={16} className="fill-yellow-400 text-yellow-400" />
                    <span>{rating.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Date picker button */}
            {/* <div className="mt-4">
              <Button variant="outline" className="w-full md:w-auto bg-white text-gray-600 border border-gray-300">
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                    <line x1="16" x2="16" y1="2" y2="6"></line>
                    <line x1="8" x2="8" y1="2" y2="6"></line>
                    <line x1="3" x2="21" y1="10" y2="10"></line>
                  </svg>
                  Pick Check-in & Check-out Dates
                </span>
              </Button>
            </div> */}
          </div>
        </div>
      </div>

      {/* Horizontal line indicators */}
      {/* <div className="flex justify-center mt-4 gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => selectImage(index)}
            className={`w-3 h-3 rounded-full ${currentIndex === index ? 'bg-hotel-accent' : 'bg-gray-300'
              }`}
          />
        ))}
      </div> */}

      {/* Image browser modal (simplified version) */}
      {showAllImages && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex justify-end p-4">
            <Button
              onClick={() => setShowAllImages(false)}
              variant="outline"
              size="sm"
              className="bg-white/20 hover:bg-white/40 text-white border-white/20"
            >
              Close
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <img
              src={images[currentIndex]}
              alt={`${title} - ${currentIndex + 1}`}
              className="max-h-[80vh] max-w-[90vw] object-contain"
            />
          </div>

          <div className="p-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => selectImage(index)}
                  className={`flex-shrink-0 ${currentIndex === index ? 'ring-2 ring-hotel-accent' : ''}`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="h-16 w-24 object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelImageGallery;
