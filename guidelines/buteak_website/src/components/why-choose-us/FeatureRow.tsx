
// import React from 'react';
import { motion } from 'framer-motion';
import FeatureImage from './FeatureImage';
import FeatureText from './FeatureText';
import { fadeInUpVariants, imageVariants } from './AnimationVariants';

interface FeatureRowProps {
  imageSrc: string;
  imageAlt: string;
  category: string;
  title: string;
  subtitle?: string;
  subtitle1?: string;
  subtitle2?: string;
  subtitle3?: string;
  description: string;
  additionalText?: string;
  imageLeft?: boolean;
  showBadge?: boolean;
  className?: string;
  breakfastDeliverey?: string;
  complimentaryBreakfast?: string;
  flexibleTiming?: string;
  regionalMenu?: string;
}

const FeatureRow: React.FC<FeatureRowProps> = ({
  imageSrc,
  imageAlt,
  category,
  title,
  subtitle,
  subtitle1,
  subtitle2,
  subtitle3,
  description,
  additionalText,
  imageLeft = false,
  showBadge = false,
  className = "",
  breakfastDeliverey,
  complimentaryBreakfast,
  flexibleTiming,
  regionalMenu
}) => {
  if (imageLeft) {
    return (
      <div className={`flex flex-col lg:flex-row items-center ${className}`}>
        <motion.div
          className="w-full lg:w-1/2 lg:pr-16 mb-10 lg:mb-0"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUpVariants}
        >
          <FeatureText
            category={category}
            title={title}
            subtitle={subtitle}
            subtitle1={subtitle1}
            subtitle2={subtitle2}
            subtitle3={subtitle3}

            description={description}
            additionalText={additionalText}
          />
        </motion.div>

        <motion.div
          className="w-full lg:w-1/2 "
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={imageVariants}
        >
          <FeatureImage
            imageSrc={imageSrc}
            imageAlt={imageAlt}
            showBadge={showBadge}
            leftAligned={false}
            breakfastDeliverey={breakfastDeliverey}
            complimentaryBreakfast={complimentaryBreakfast}
            flexibleTiming={flexibleTiming}
            regionalMenu={regionalMenu}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col-reverse lg:flex-row items-center ${className}`}>
      <motion.div
        className="w-full lg:w-1/2 relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={imageVariants}
      >
        <FeatureImage
          imageSrc={imageSrc}
          imageAlt={imageAlt}
          leftAligned={true}
          breakfastDeliverey={breakfastDeliverey}
          complimentaryBreakfast={complimentaryBreakfast}
          flexibleTiming={flexibleTiming}
          regionalMenu={regionalMenu}
        />
      </motion.div>

      <motion.div
        className="w-full lg:w-1/2 lg:pl-16 mb-10 lg:mb-0"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUpVariants}
      >
        <FeatureText
          category={category}
          title={title}
          subtitle={subtitle}
          subtitle1={subtitle1}
          subtitle2={subtitle2}
          subtitle3={subtitle3}
          description={description}
          additionalText={additionalText}
        />
      </motion.div>
    </div>
  );
};

export default FeatureRow;
