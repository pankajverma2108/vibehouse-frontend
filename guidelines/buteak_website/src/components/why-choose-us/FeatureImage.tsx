
import React from 'react';
import { motion } from 'framer-motion';

interface FeatureImageProps {
  imageSrc: string;
  imageAlt: string;
  showBadge?: boolean;
  leftAligned?: boolean;
  breakfastDeliverey: string
  complimentaryBreakfast: string
  flexibleTiming: string
  regionalMenu: string
}

const FeatureImage: React.FC<FeatureImageProps> = ({ imageSrc, breakfastDeliverey, complimentaryBreakfast, flexibleTiming, regionalMenu, imageAlt, showBadge = false, leftAligned = false }) => {
  return (
    <div className="relative">
      {leftAligned && (
        <motion.div
          className="bg-[#f0f5f5] absolute -top-8 -left-16 w-72 h-72 z-0 "
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
      )}
      <motion.div
        className={`${leftAligned ? 'relative z-10 shadow-lg' : 'rounded-lg overflow-hidden shadow-lg'}`}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full object-cover"
        />
        <img
          src={breakfastDeliverey}
          alt={imageAlt}
          className="w-full object-cover"
        />
        <img
          src={complimentaryBreakfast}
          alt={imageAlt}
          className="w-full object-cover"
        />
        <img
          src={flexibleTiming}
          alt={imageAlt}
          className="w-full object-cover"
        />
        <img
          src={regionalMenu}
          alt={imageAlt}
          className="w-full object-cover"
        />
      </motion.div>

      {/* {showBadge && (
        <motion.div 
          className="absolute -bottom-10 -right-10 bg-white p-8 shadow-xl max-w-[200px] flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5 }}
          whileHover={{ 
            y: -5,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}
        >
          <div className="mb-2">
            <img 
              src="/lovable-uploads/a6bb7fcc-8a91-4ef8-abb7-809c39e0897e.png" 
              alt="Buteak Stays Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <h4 className="text-sm font-bold text-center">BUTEAK STAYS</h4>
          <p className="text-xs text-center mt-1 text-gray-600">Premium living experience</p>
        </motion.div>
      )} */}
    </div>
  );
};

export default FeatureImage;
