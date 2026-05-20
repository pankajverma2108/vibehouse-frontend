
import React from 'react';
import { motion } from 'framer-motion';
import { FileCheck, Users2, MessageSquareText, Rocket } from 'lucide-react';
import { fadeInUpVariants } from './why-choose-us/AnimationVariants';

interface ExpectationItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const ExpectationItem: React.FC<ExpectationItemProps> = ({ icon, title, description, index }) => {
  return (
    <motion.div 
      className="flex items-start gap-5"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeInUpVariants}
      custom={index * 0.2}
      transition={{ delay: index * 0.1 }}
    >
      <div className="bg-hotel-accent/20 p-4 rounded-full flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/80">{description}</p>
      </div>
    </motion.div>
  );
};

const ExpectationsSection = () => {
  const expectations = [
    {
      icon: <FileCheck className="h-8 w-8 text-hotel-accent" />,
      title: "Detailed Evaluation",
      description: "Every proposal is reviewed thoroughly and objectively. We respect your time and take your interest seriously."
    },
    {
      icon: <Users2 className="h-8 w-8 text-hotel-accent" />,
      title: "Transparent Selection",
      description: "Our approval process is clear, data-driven, and focused on generating real value for both parties."
    },
    {
      icon: <MessageSquareText className="h-8 w-8 text-hotel-accent" />,
      title: "Swift Communication",
      description: "Once aligned, we move fast—keeping you informed and involved every step of the way."
    },
    {
      icon: <Rocket className="h-8 w-8 text-hotel-accent" />,
      title: "Accelerated Project Kickoff",
      description: "Once we seal the deal, our design and execution teams hit the ground running, ensuring efficient site mobilization and launch."
    }
  ];

  return (
    <section className="relative py-12 md:py-16 overflow-hidden">
      {/* Background image with parallax effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1551038247-3d9af20df552?q=80&w=3000&auto=format&fit=crop')",
          backgroundAttachment: "fixed"
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-hotel-primary/80 backdrop-blur-sm z-10"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-20">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            What You Can Expect From Us
          </h2>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
          {/* <p className="text-lg text-white/80 max-w-3xl mx-auto">
            When you partner with Buteak Suites, you benefit from our streamlined, 
            transparent approach to collaboration that prioritizes efficiency and mutual success.
          </p> */}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 max-w-5xl mx-auto">
          {expectations.map((item, index) => (
            <ExpectationItem 
              key={index}
              icon={item.icon}
              title={item.title}
              description={item.description}
              index={index}
            />
          ))}
        </div>
        
        {/* Decorative element */}
        <motion.div 
          className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white to-transparent opacity-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.1 }}
          viewport={{ once: true }}
        />
      </div>
    </section>
  );
};

export default ExpectationsSection;
