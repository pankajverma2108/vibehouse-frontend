
import React from 'react';
import { motion } from 'framer-motion';
import { Users, Award, Shield, DollarSign, Compass, ShieldCheck } from 'lucide-react';
import { 
  Card,
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  containerVariants, 
  itemVariants 
} from '@/components/why-choose-us/AnimationVariants';

const partnerQualities = [
  {
    icon: <Users className="h-10 w-10 text-hotel-accent" />,
    title: "Shared Vision",
    description: "We're looking for partners who aim high and believe in redefining hospitality—not just running another hotel."
  },
  {
    icon: <Award className="h-10 w-10 text-hotel-accent" />,
    title: "Commitment to Quality",
    description: "Our spaces reflect craftsmanship and care. We expect the same standards from those we partner with."
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-hotel-accent" />,
    title: "Integrity & Transparency",
    description: "Great partnerships are built on trust. We’re open with you—we expect the same in return."
  },
  {
    icon: <DollarSign className="h-10 w-10 text-hotel-accent" />,
    title: "Financial Readiness",
    description: "We invest significant time and resources in each property. We value partners who are well-prepared for long-term collaboration."
  },
  {
    icon: <Compass className="h-10 w-10 text-hotel-accent" />,
    title: "Strategic Thinking",
    description: "We’re in it for the long game. We partner with developers who understand the value of patience, consistency, and long-term wins."
  },
  {
    icon: <Shield className="h-10 w-10 text-hotel-accent" />,
    title: "Resilient Attitude",
    description: "Markets shift—but our shared commitment to building a future-proof hospitality product should never waver."
  }
];

const PartnerRequirements = () => {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-hotel-light to-white">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className=" text-3xl md:text-4xl font-bold  mb-4">
            What We Look For in a Partner
          </h2>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
          {/* <p className="text-lg text-hotel-body max-w-3xl mx-auto">
            Building successful partnerships requires alignment of values, vision, and capabilities. 
            Here's what makes an ideal Buteak Suites partner:
          </p> */}
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {partnerQualities.map((quality, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              custom={index}
              className="flex flex-col h-full"
              whileHover={{ 
                y: -10, 
                transition: { duration: 0.3 }
              }}
            >
              <Card className="h-full bg-white shadow-lg border-0 hover:shadow-xl transition-shadow duration-300 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-2 h-full bg-hotel-accent"></div>
                <CardHeader className="pb-2">
                  <div className="mb-4 flex justify-center">
                    <div className="p-4 rounded-full bg-hotel-primary/10 flex items-center justify-center">
                      {quality.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-center text-hotel-primary">
                    {quality.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-hotel-body text-center">
                    {quality.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PartnerRequirements;
