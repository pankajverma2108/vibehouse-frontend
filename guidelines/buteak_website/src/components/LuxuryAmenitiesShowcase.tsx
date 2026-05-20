
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    LibraryBig,
    Utensils,
    Zap, // Using Waves icon instead of Pool which doesn't exist
    SprayCan, // Using BrushCleaning instead of ConciergeBell which doesn't exist
    Bed, // Using Dumbbell directly without alias
    ShoppingBasket, // Using Bell instead of ConciergeBell which doesn't exist
    ShieldCheck,
    Tv

} from 'lucide-react';

interface AmenityCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay: number;
}

const AmenityCard = ({ icon, title, description, delay }: AmenityCardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: delay * 0.2 }}
            className="relative border-2 border-[#F0F0F0] rounded-xl overflow-hidden group"
        >
            <div className="absolute inset-0 bg-hotel-accent/10 transform origin-bottom scale-y-0 group-hover:scale-y-100 transition-transform duration-500" />
            <div className="p-2 md:p-6 relative z-10">
                <div className="bg-hotel-primary/5 p-4 rounded-full w-14 h-14 md:w-16 md:h-16 flex items-center justify-center mx-auto mb-4 text-hotel-primary group-hover:text-hotel-accent group-hover:bg-hotel-primary/10 transition-colors duration-300">
                    {icon}
                </div>
                <h3 className="md:text-xl font-schibsted font-bold text-[16px] text-[#494949] text-center mb-2">{title}</h3>
                <p className="text-center font-inter text-height md:text-[18px] text-[14px] text-[#494949] text-hotel-body">{description}</p>
            </div>
        </motion.div>
    );
};

const LuxuryAmenitiesShowcase = () => {
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) {
            observer.observe(sectionRef.current);
        }

        return () => {
            if (sectionRef.current) {
                observer.unobserve(sectionRef.current);
            }
        };
    }, []);

    const amenities = [
        {
            title: "Premium Linen",
            description: " Best linen used by hotel such as Radisson- 400 GSM bedsheets and 700 GSM towels.",
            icon: <Bed size={32} />
        },
        {
            title: "Lounge And Library",
            description: "100+ books at our lounge where you can relax, meet others or read a book.",
            icon: <LibraryBig size={32} />
        },
        {
            title: "100% Generator Back up",
            description: "100% Generator Back up for your AC, Lights and Lift",
            icon: <Zap size={32} />
        },
        {
            title: "Fully Equipped Kitchen",
            description: "Salt, Sugar, Oil, Tea Coffee is provided.",
            icon: <Utensils size={32} />
        },
        {
            title: "Complementary Services",
            description: "Grocery or Medicine Shopping by our service Team.",
            icon: <ShoppingBasket size={32} />
        },
        {
            title:
                (
                    <>
                        Cleaning <br />Services
                    </>
                ),

            description: "Unlimited Cleaning Services, just log in your request on Buteak Whatsapp account.",
            icon: <SprayCan size={32} />
        },
        {
            title: "Security",
            description: " Limited Access to Floors, CCTV Cameras, Security Personnel on Premises.",
            icon: <ShieldCheck size={32} />
        },
        {
            title: "Smart Entertainment",
            description: "Smart TV wth streaming services.",
            icon: <Tv size={32} />
        }
    ];

    return (
        <section ref={sectionRef} className="py-10 md:py-10 bg-[#F7F7F7] relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 ">
                <div className="absolute  w-full h-full "></div>
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Section Header with animated underline */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={isVisible ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.7 }}
                        className=""
                    >
                        <span className="text-hotel-accent text-[15px] md:text-[20px] font-medium uppercase tracking-wider">Luxury Living</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={isVisible ? { opacity: 1 } : {}}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-2xl text-hotel-primary md:text-3xl md:pt-6 font-bold mb-2"
                    >
                        Amenities
                    </motion.h2>

                    <motion.div
                        initial={{ width: 0 }}
                        animate={isVisible ? { width: "100px" } : {}}
                        transition={{ duration: 0.7, delay: 0.5 }}
                        className="w-24 h-1 bg-hotel-accent mx-auto md:mt-4 mt-2 mb-6"
                    />

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={isVisible ? { opacity: 1 } : {}}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="max-w-2xl mx-auto text-[14px] text-height md:text-lg"
                    >
                        Experience thoughtfully designed spaces with plush bedding, premium linens used by Hotels such as Radisson, Pullman and Lemon Tree, and luxurious bath essentials. Each room is equipped with a selection of beverages, everyday kitchen basics, and convenient in-room appliances for your comfort.
                    </motion.p>
                </div>

                {/* Amenities Grid */}
                <div className="grid grid-cols-2 md:grid-cols-1 bg-[#F7F7F7] sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {amenities.map((amenity, index) => (
                        <AmenityCard
                            key={index}
                            icon={amenity.icon}
                            title={amenity.title}
                            description={amenity.description}
                            delay={index}
                        />
                    ))}
                </div>

                {/* CTA Button with animation */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, delay: 0.7 }}
                    className="text-center mt-10"
                >
                    <Button asChild variant="outline" className="border-hotel-accent text-hotel-accent hover:bg-hotel-accent/10">
                        <Link to="/amenities">View All Amenities</Link>
                    </Button>
                </motion.div>
            </div>

            {/* Decorative elements */}
            {/* <motion.div
                initial={{ opacity: 0, x: -100 }}
                animate={isVisible ? { opacity: 0.2, x: 0 } : {}}
                transition={{ duration: 1, delay: 0.5 }}
                className="absolute -left-20 top-1/4 w-64 h-64 bg-hotel-accent rounded-full blur-3xl z-0"
            />
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={isVisible ? { opacity: 0.15, x: 0 } : {}}
                transition={{ duration: 1, delay: 0.7 }}
                className="absolute -right-20 bottom-1/4 w-80 h-80 bg-hotel-primary rounded-full blur-3xl z-0"
            /> */}
        </section>
    );
};

export default LuxuryAmenitiesShowcase;
