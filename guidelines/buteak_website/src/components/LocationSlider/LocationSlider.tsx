// import Image from 'next/image';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';

interface LocationProps {
    name: string;
    city: string;
    image: string;
    to: string;
}

const LocationCard: React.FC<LocationProps> = ({ name, city, image, to }) => {

    return (
        // <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-500 h-full">
        //     <CardContent className="p-0 h-full flex flex-col overflow-hidden">
        //         <div className="relative h-48 w-full">
        //             <img
        //                 src={image}
        //                 alt={name}
        //                 // layout="fill"
        //                 // objectFit="cover"
        //                 className="rounded-t-lg"
        //             />
        //         </div>
        //     </CardContent>
        //     <div className="p-4 flex-1 flex flex-col justify-between">
        //         <h3 className="text-xl font-semibold text-gray-800">{name}</h3>
        //         <p className="text-sm text-gray-500">{city}</p>
        //     </div>
        // </Card>
        <div className="overflow-hidden rounded-lg bg-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <Link to={to} className="block">
                <div className="aspect-square overflow-hidden">
                    <img
                        src={image}
                        alt={`${name}, ${city}`}
                        className="w-full h-full object-cover transition-transform duration-500"
                    />
                </div>
                <div className="p-4 text-center">
                    <h3 className="text-xl font-semibold hover:text-hotel-accent transition-colors">{name}</h3>
                    <p className="flex items-center justify-center gap-1 text-hotel-body mt-1">
                        <MapPin className="h-4 w-4" />
                        <span>{city}</span>
                    </p>
                </div>
            </Link>
        </div>
    );
};

const LocationSection = () => {

    const phoneNumber = '919993177238';
    const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

    const handleWhatsAppClick = () => {
        window.open(`https://live.ipms247.com/booking/book-rooms-buteaksuites-lf`, '_blank');
    };
    const locations = [
        {
            name: "BTM Layout",
            city: "Bangalore",
            image: "/images/location/btm-layout.svg",
            to: "/hotels"
        },
        // {
        //     name: "BTM  New Layout",
        //     city: "Bangalore",
        //     image: "/images/location/btm-layout.svg",
        //     to: "/hotels"
        // }
        // {
        //     name: "HSR Layout",
        //     city: "Bangalore",
        //     image: "/images/location/hsr-layout.png",
        //     to: "/locations/hsr-layout"
        // },
        // {
        //     name: "Koramangala",
        //     city: "Bangalore",
        //     image: "/images/location/koramangal.png",
        //     to: "/locations/koramangala"
        // },
        // {
        //     name: "Indira Nagar",
        //     city: "Bangalore",
        //     image: "/images/location/indira-nagar.png",
        //     to: "/locations/indira-nagar"
        // }
    ];

    return (
        <section className="py-10 md:py-6 bg-[#E6EBEC]">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-8 ">
                    <div className="flex items-center flex-col justify-center flex-wrap gap-4">
                        <p className="text-[18px] lg:text-[24px]  mb-2 font-semibold text-hotel-primary  max-w-5xl">
                            All the luxury of five-star hospitality, all the comfort of apartment living — in one place.
                        </p>
                        <Button onClick={handleWhatsAppClick} className="hotel-button md:mt-4 mt-0 mb-6 text-[18px]">
                            Book Your Stay
                        </Button>

                    </div>
                    <h2 className="text-2xl text-hotel-primary md:text-3xl pt-10 md:pt-12 font-bold mb-2">Explore Our Locations</h2>
                    <div className="w-24 h-1 bg-hotel-accent mx-auto mb-4"></div>
                    <p className="text-hotel-body max-w-2xl mx-auto">
                        Find your perfect stay at one of our premium locations across Bangalore.
                    </p>
                </div>

                <div className="md:mb-12 mb-0">
                    {/* <Carousel className="w-full max-w-5xl mx-auto" opts={{ align: "center", loop: true }}>
                        <CarouselContent>
                            {locations.map((location, index) => (
                                <>
                                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 pl-4">
                                        <div className="p-4 h-full">
                                            <LocationCard
                                                key={index}
                                                name={location.name}
                                                city={location.city}
                                                image={location.image}
                                                to={location.to}
                                            />
                                        </div>
                                    </CarouselItem>
                                </>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="absolute left-4 bg-white border-hotel-accent text-hotel-accent hover:bg-hotel-accent hover:text-white transition-all" />
                        <CarouselNext className="absolute right-4 bg-white border-hotel-accent text-hotel-accent hover:bg-hotel-accent hover:text-white transition-all" />
                    </Carousel> */}

                    <div className="flex item-center w-full justify-center flex-wrap  max-w-5xl mx-auto">
                        {locations.map((location, index) => (
                            <>
                                <div className="p-4" key={index}>
                                    <Link to={location.to} className="block">
                                        <img src={location.image} alt={location.name} />
                                        <h3 className="text-xl mt-3 flex items-center justify-center font-semibold hover:text-hotel-accent transition-colors">{location.name}</h3>
                                        <p className="flex items-center justify-center gap-1 mt-0 text-hotel-body mt-1">{location.city}</p>
                                    </Link>
                                </div>
                            </>
                        ))}

                    </div>
                </div>
            </div>
        </section>
    );
};

export default LocationSection;
