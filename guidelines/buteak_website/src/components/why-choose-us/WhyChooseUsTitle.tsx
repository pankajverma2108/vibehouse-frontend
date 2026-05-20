
// import React from 'react';
import { motion } from 'framer-motion';
import { itemVariants } from './AnimationVariants';

const WhyChooseUsTitle = () => {
  return (
    <motion.h2
      className="text-2xl text-center text-hotel-primary md:text-3xl  md:pt-12 font-bold mb-2"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={itemVariants}
    >
      Why Choose <span className="text-hotel-primary">Buteak Suites ?</span>
      <div className="w-24 h-1 bg-hotel-accent mt-2 md:mt-4 mx-auto mb-8"></div>

    </motion.h2>
  );
};

export default WhyChooseUsTitle;
