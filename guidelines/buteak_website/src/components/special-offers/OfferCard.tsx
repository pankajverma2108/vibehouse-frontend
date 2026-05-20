
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import type { OfferData } from '@/data/special-offers';

const OfferCard = ({
  title,
  description,
  features = [], // Provide default empty array
  image,
  badgeText,
  badgeColor,
  cardColor,
  textColor
}: OfferData) => {
  // Add debug log
  console.log(`Rendering OfferCard: ${title}`, { features });

  const phoneNumber = '919993177238';
  const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

  const handleWhatsAppClick = () => {
    window.open(`https://live.ipms247.com/booking/book-rooms-buteaksuites-lf`, '_blank');
  };
  return (
    <Card className="overflow-hidden shadow-lg border-0 h-full flex flex-col">
      <AspectRatio ratio={16 / 9}>
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full"
        />
      </AspectRatio>
      <div className={`${cardColor} ${textColor} p-8 flex-grow flex flex-col`}>
        {/* <span className={`inline-block px-3 py-1 ${badgeColor} rounded-full text-sm font-medium mb-4`}>
          {badgeText}
        </span> */}
        <div className="flex-grow">
          <h3 className="text-xl font-bold mb-2" style={{ color: cardColor.includes('primary') ? '#D4A437' : '#0B3C49' }}>{title}</h3>
          <p className="mb-4" style={{ color: cardColor.includes('primary') ? '#D4A437' : '#0B3C49', whiteSpace: 'pre-line' }}>{description}</p>

          {/* Only render the ul if features array has items */}
          {Array.isArray(features) && features.length > 0 ? (
            <ul className="space-y-3 mb-6">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <span className="mr-2">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Button onClick={handleWhatsAppClick} asChild className="mt-4 bg-white hover:bg-white/90 border-none text-lg px-6 py-2 self-start"
          style={{ color: cardColor.includes('primary') ? '#0B3C49' : '#0B3C49' }}>
          <Link to="/">Book Now</Link>
        </Button>
      </div>
    </Card>
  );
};

export default OfferCard;
