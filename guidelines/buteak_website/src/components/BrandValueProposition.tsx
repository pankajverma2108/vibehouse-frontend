
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FastForward, DollarSign, Award, Users, Check, Handshake } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Card, CardContent } from "@/components/ui/card";
import { containerVariants, itemVariants } from '@/components/why-choose-us/AnimationVariants';

const features = [
  {
    icon: <Check className="h-6 w-6 text-white" />,
    title: "Quality Over Quantity",
    description: "We don’t aim to be the biggest—we aim to be the best. That’s why we selectively partner with like-minded owners who value excellence."
  },
  {
    icon: <Shield className="h-6 w-6 text-white" />,
    title: "Transparent Process",
    description: "The hospitality world can be complex—we keep it simple. Clear terms, honest communication, no hidden clauses."
  },
  {
    icon: <FastForward className="h-6 w-6 text-white" />,
    title: "Fast-Track Execution",
    description: "Thanks to our agile Project &amp; Design team, we build, convert, and launch faster than most brands in our segment—without compromising on quality."
  },
  {
    icon: <DollarSign className="h-6 w-6 text-white" />,
    title: "Smart Spend, Stronger Returns",
    description: "With our locally sourced materials and efficient design planning, your investment works harder and goes further."
  },
  {
    icon: <Award className="h-6 w-6 text-white" />,
    title: "Premium Product with Superior Quality",
    description: "Our aparthotels are known for modern design, thoughtful amenities, and high guest satisfaction. Just ask our guests—or read the reviews."
  },
  {
    icon: <Users className="h-6 w-6 text-white" />,
    title: "High Occupancy, Repeat Guests",
    description: "We don’t just fill rooms—we build relationships. Our extended stay model ensures strong repeat rates and long-term performance."
  }
];

const BrandValueProposition = () => {
  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
      {/* Background with diagonal pattern overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-hotel-light to-white z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(135deg, rgba(11, 60, 73, 0.05) 25%, transparent 25%, transparent 50%, rgba(11, 60, 73, 0.05) 50%, rgba(11, 60, 73, 0.05) 75%, transparent 75%, transparent)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold  relative inline-block">
            Team Up with a Brand That Delivers
            <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
            {/* <motion.div
              className="absolute -bottom-2 left-1/2 h-1.5 bg-hotel-accent"
              initial={{ width: 0, x: '-50%' }}
              whileInView={{ width: '70%', x: '-50%' }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
            /> */}
          </h2>
          <p className="text-lg text-hotel-body max-w-3xl mx-auto">
            Partner with Buteak Suites and benefit from our industry expertise, operational excellence, and commitment to creating exceptional guest experiences that drive financial success.
          </p>
        </motion.div>

        {/* Hero Feature with Handshake */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8"
        >
          <div className="md:w-1/2">
            <div className="bg-hotel-primary p-10 md:p-16 rounded-xl shadow-xl text-white relative overflow-hidden">
              <div className="absolute -right-16 -bottom-16 opacity-15">
                <Handshake size={180} strokeWidth={1} />
              </div>
              <h3 className="text-2xl md:text-3xl text-hotel-accent font-bold mb-4">Strategic Partnership</h3>
              <p className="text-white/90 text-lg mb-6 max-w-md">
                Join forces with Buteak Suites to transform properties into thriving hospitality ventures. Our proven operational model and brand recognition deliver exceptional results.
              </p>
              <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                <p className="italic text-white/80">
                  "Our partnership with Buteak Suites increased our property's revenue by 32% in the first year alone."
                </p>
                <p className="font-semibold text-hotel-accent mt-2">— Property Developer</p>
              </div>
            </div>
          </div>

          <div className="md:w-1/2 md:p-6">
            <h3 className="text-xl md:text-2xl font-bold text-hotel-primary mb-6">Why Property Owners Choose Us</h3>
            <ul className="space-y-4">
              {[
                "Established brand reputation that drives bookings",
                "Revenue optimization expertise across all markets",
                "Operational excellence to maximize ROI",
                "Flexible partnership structures tailored to your goals",
                "Dedicated support team throughout the relationship"
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3"
                >
                  <div className="bg-hotel-accent rounded-full p-1 mt-1 flex-shrink-0">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-hotel-body">{item}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Features Grid with Hover Effect Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                y: -10,
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
              }}
              transition={{ duration: 0.2 }}
              className="relative group"
            >
              <Card className="h-full border-none shadow-lg overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-hotel-accent to-hotel-primary" />
                <div className="absolute top-0 right-0">
                  <div className="bg-hotel-primary p-4 rounded-bl-xl">
                    {feature.icon}
                  </div>
                </div>
                <CardContent className="pt-10 pb-6 px-6">
                  <h3 className="text-xl font-semibold text-hotel-heading mb-3 mt-2">
                    {feature.title}
                  </h3>
                  <p className="text-hotel-body">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* <div className="mt-16 max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold text-hotel-primary mb-6">Frequently Asked Questions</h3>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-hotel-heading text-left">
                What kind of properties are you looking for?
              </AccordionTrigger>
              <AccordionContent className="text-hotel-body">
                We primarily seek properties in prime urban locations with 25-100 units, either existing
                buildings suitable for conversion or new developments designed specifically for aparthotel use.
                Proximity to business districts, transportation hubs, and lifestyle amenities is essential.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-hotel-heading text-left">
                How long does implementation typically take?
              </AccordionTrigger>
              <AccordionContent className="text-hotel-body">
                For existing properties requiring conversion, our timeline typically ranges from 3-6 months
                from agreement to operation. New developments align with construction schedules, with our
                team providing design and operational guidance throughout the process.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-hotel-heading text-left">
                What returns can partners expect?
              </AccordionTrigger>
              <AccordionContent className="text-hotel-body">
                While each property is unique, our portfolio consistently delivers returns 15-25% above
                traditional long-term rental models. Detailed projections are provided during our partnership
                discussions, tailored to your specific property and market conditions.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div> */}
      </div>
    </section>
  );
};

export default BrandValueProposition;
