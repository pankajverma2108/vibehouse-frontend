
import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AmenityCategoryCard from './AmenityCategoryCard';
import { amenitiesData } from '@/data/amenities';

const AmenitiesDetailSection = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <section className="py-16 md:py-16 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need For A Perfect Stay</h2>
                    <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
                    <p className="text-hotel-body max-w-3xl mx-auto">
                        Our comprehensive range of amenities ensures that every aspect of your stay is catered to with the utmost attention to detail and comfort.
                    </p>
                </div>

                <Tabs defaultValue="all" className="w-full mb-8">
                    <TabsList className="flex flex-wrap justify-center py-4 mb-12 md:mb-12">
                        <TabsTrigger value="all" className="tab-button">All Amenities</TabsTrigger>
                        <TabsTrigger value="bathroom" className="tab-button">Bathroom</TabsTrigger>
                        <TabsTrigger value="bedroom" className="tab-button">Bedroom & Laundry</TabsTrigger>
                        <TabsTrigger value="outdoor" className="tab-button">Outdoor</TabsTrigger>
                        <TabsTrigger value="services" className="tab-button">Services</TabsTrigger>
                        <TabsTrigger value="entertainment" className="tab-button">Entertainment</TabsTrigger>
                        <TabsTrigger value="safety" className="tab-button">Safety</TabsTrigger>
                        <TabsTrigger value="access" className="tab-button">Access</TabsTrigger>
                        <TabsTrigger value="internet" className="tab-button">Internet & Office</TabsTrigger>
                        <TabsTrigger value="kitchen" className="tab-button">Kitchen & Dining</TabsTrigger>
                        <TabsTrigger value="additional" className="tab-button">Additional</TabsTrigger>
                        <TabsTrigger value="climate" className="tab-button">Climate Control</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-50px" }}
                            className="space-y-16"
                        >
                            {Object.keys(amenitiesData).map((category) => (
                                <AmenityCategoryCard
                                    key={category}
                                    title={amenitiesData[category].title}
                                    amenities={amenitiesData[category].items}
                                    icon={amenitiesData[category].icon}
                                    color={amenitiesData[category].color}
                                />
                            ))}
                        </motion.div>
                    </TabsContent>

                    {Object.keys(amenitiesData).map((category) => (
                        <TabsContent key={category} value={category}>
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                            >
                                <AmenityCategoryCard
                                    title={amenitiesData[category].title}
                                    amenities={amenitiesData[category].items}
                                    icon={amenitiesData[category].icon}
                                    color={amenitiesData[category].color}
                                    expanded={true}
                                />
                            </motion.div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </section>
    );
};

export default AmenitiesDetailSection;
