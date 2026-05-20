
import React from 'react';
import { motion } from 'framer-motion';
import { AmenityItem } from '@/types/amenity';
import AmenityIcon from './AmenityIcon';

interface AmenityCategoryCardProps {
    title: string;
    amenities: AmenityItem[];
    icon: React.ReactNode;
    color: string;
    expanded?: boolean;
}

const AmenityCategoryCard: React.FC<AmenityCategoryCardProps> = ({
    title,
    amenities,
    icon,
    color,
    expanded = false
}) => {
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div
            variants={itemVariants}
            className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
        >
            <div className={`flex items-center p-3 md:p-6 ${color}`}>
                <div className="mr-4 text-white">
                    {icon}
                </div>
                <h3 className="text:l md:text-2xl md:text-43l font-semibold text-white">{title}</h3>
            </div>

            <div className="p-3 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {amenities.map((amenity, index) => (
                        <div
                            key={index}
                            className="flex items-center p-2 md:p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300"
                        >
                            <div className="mr-4 text-hotel-primary">
                                <AmenityIcon iconName={amenity.icon} size={24} />
                            </div>
                            <div>
                                <p className=" text-[14px] font-medium">{amenity.name}</p>
                                {/* {expanded && amenity.description && (
                                    <p className="text-sm text-gray-500 mt-1">{amenity.description}</p>
                                )} */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default AmenityCategoryCard;
