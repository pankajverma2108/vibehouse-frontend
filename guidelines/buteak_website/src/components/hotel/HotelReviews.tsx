
import React from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Review type definition
interface Review {
  id: string;
  rating: number;
  text: string;
  author: string;
  location?: string;
  userIcon?: string;
}

interface HotelReviewsProps {
  reviews: Review[];
}

const HotelReviews: React.FC<HotelReviewsProps> = ({ reviews }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviews.length - 1 : prev - 1));
  };

  // Calculate average rating
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

  return (
    <div className="space-y-6 bg-[#ffffff] py-8 px-8">
      {/* TripAdvisor-style header */}
      <div className="flex flex-col md:flex-row item-left md:items-center gap-4">
        <img
          src="https://static.tacdn.com/img2/brand_refresh/Tripadvisor_lockup_horizontal_secondary_registered.svg"
          alt="TripAdvisor"
          className="h-10"
        />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <div key={star} className="w-6 h-6 rounded-full bg-hotel-accent flex items-center justify-center">
              {star <= Math.round(averageRating) ? (
                <Star size={14} className="text-white fill-white" />
              ) : (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
          ))}
          <span className="text-2xl font-bold ml-2">{averageRating.toFixed(1)}</span>
        </div>
        <div className="text-sm text-gray-500">
          From {reviews.length} Reviews on Tripadvisor
        </div>
      </div>

      {/* Reviews carousel */}
      <div className="relative">
        <div className="flex overflow-hidden">
          <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
            {reviews.map((review, index) => (
              <Card key={review.id} className="min-w-full p-6 bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={`${star <= review.rating ? "text-hotel-accent fill-hotel-accent" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-gray-500 text-[16px] mb-4">{review.text}</p>
                <div className="flex items-center gap-3">
                  {review.userIcon ? (
                    <img src={review.userIcon} alt={review.author} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white">
                      {review.author.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-gray-700 text-[16px] font-bold">{review.author}</p>
                    {/* {review.location && <p className="text-sm text-gray-500">{review.location}</p>} */}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <Button
          onClick={handlePrev}
          size="icon"
          variant="outline"
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white z-10"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleNext}
          size="icon"
          variant="outline"
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white z-10"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {reviews.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-hotel-accent' : 'bg-gray-300'}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HotelReviews;
