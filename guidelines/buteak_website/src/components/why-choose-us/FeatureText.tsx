
import React from 'react';
import { motion } from 'framer-motion';
import { itemVariants } from './AnimationVariants';

interface FeatureTextProps {
  category: string;
  title: string;
  subtitle?: string;
  subtitle1?: string;
  subtitle2?: string;
  subtitle3?: string;
  description: string;
  additionalText?: string;
}

const FeatureText: React.FC<FeatureTextProps> = ({
  category,
  title,
  subtitle,
  subtitle1,
  subtitle2,
  subtitle3,
  description,
  additionalText
}) => {
  return (
    <div className="max-w-xl">
      <motion.span
        className="uppercase text-xs tracking-wide text-hotel-accent font-medium mb-3 block"
        variants={itemVariants}
      >
        {category}
      </motion.span>
      <motion.h2
        className="text-2xl md:text-3xl font-bold text-hotel-heading mb-2"
        variants={itemVariants}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.li animate="visible"
          className="text-lg text-hotel-body  flex leading-relaxed mb-2"
          variants={itemVariants}
        >
          {subtitle}
        </motion.li>
      )}
      {subtitle1 && (
        <motion.li animate="visible"
          className="text-lg text-hotel-body  leading-relaxed mb-2"
          variants={itemVariants}
        >
          {subtitle1}
        </motion.li>
      )}
      {subtitle2 && (
        <motion.li animate="visible"
          className="text-lg text-hotel-body  leading-relaxed mb-2"
          variants={itemVariants}
        >
          {subtitle2}
        </motion.li>
      )}
      {subtitle3 && (
        <motion.li animate="visible"
          className="text-lg text-hotel-body leading-relaxed mb-2"
          variants={itemVariants}
        >
          {subtitle3}
        </motion.li>
      )}
      {/* <motion.p
        className="text-lg text-hotel-body leading-relaxed mb-2"
        variants={itemVariants}
      >
        {description}
      </motion.p> */}
      {additionalText && (
        <motion.p
          className="text-lg text-hotel-body leading-relaxed mb-10"
          variants={itemVariants}
        >
          {additionalText}
        </motion.p>
      )}
    </div>
  );
};

export default FeatureText;
