
import React, { useState, useRef, useEffect } from 'react';
import { fetchRoomPrices, mapRoomTypeToRoomId } from '@/services/priceApi';
import { rooms as hotelRooms } from '@/data/hotel-room/HotelRooms';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ImageCarousel from '@/components/ui/ImageCarousel';
import { BedDouble, MapPin, StarIcon, HelpCircle, ShowerHead } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useParams } from 'react-router-dom';
import HotelReviews from '@/components/hotel/HotelReviews';
import HotelImageGallery from '@/components/hotel/HotelImageGallery';
import HotelLocation from '@/components/hotel/HotelLocation';
import HotelFAQ from '@/components/hotel/HotelFAQ';
import HotelHighlightsCarousel from '@/components/hotel/HotelHighlightsCarousel';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wifi, Dumbbell, Utensils, ConciergeBell, ParkingCircle, Plane, Briefcase, Users, Circle
} from "lucide-react"
const HotelPage = () => {
  const { hotelId } = useParams();
  const [selectedTab, setSelectedTab] = useState("rooms");
  const navigate = useNavigate();
  // Create refs for each section
  const roomsRef = useRef<HTMLDivElement>(null);
  const amenitiesRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef<HTMLDivElement>(null);
  const faqsRef = useRef<HTMLDivElement>(null);

  // Function to handle tab clicks
  const handleTabChange = (value: string) => {
    setSelectedTab(value);

    // Scroll to the corresponding section
    const refs: { [key: string]: React.RefObject<HTMLDivElement> } = {
      rooms: roomsRef,
      amenities: amenitiesRef,
      reviews: reviewsRef,
      location: locationRef,
      highlights: highlightsRef,
      faqs: faqsRef,
    };

    const targetRef = refs[value];
    if (targetRef && targetRef.current) {
      // Add a small delay to ensure the UI has updated before scrolling
      setTimeout(() => {
        // Calculate position to include the heading
        const position = targetRef.current?.offsetTop - 100; // Subtract some pixels to show heading
        window.scrollTo({
          top: position,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  // Check which section is currently in view and update the tab
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setSelectedTab(id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -60% 0px', // Adjust root margin to trigger earlier
        threshold: 0.1 // Trigger when 10% of the element is visible
      }
    );

    // Observe all section elements
    const sections = [
      { ref: roomsRef, id: 'rooms' },
      { ref: amenitiesRef, id: 'amenities' },
      { ref: reviewsRef, id: 'reviews' },
      { ref: locationRef, id: 'location' },
      { ref: highlightsRef, id: 'highlights' },
      { ref: faqsRef, id: 'faqs' }
    ];

    sections.forEach(section => {
      if (section.ref.current) {
        observer.observe(section.ref.current);
      }
    });

    return () => {
      sections.forEach(section => {
        if (section.ref.current) {
          observer.unobserve(section.ref.current);
        }
      });
    };
  }, []);

  // Hotel details (would come from an API in a real app)
  const hotel = {
    id: hotelId || "buteak-hotel",
    name: "Buteak Hotel - BTM Layout",
    location: "City Center",
    rating: 5.0,
    // price: 3528,
    description: "Experience luxury in the heart of the city with our premium suites designed for comfort and elegance.",
    checkInTime: "2:00pm",
    checkOutTime: "11:00am",
  };

  // Room types with dynamic pricing - no fallback prices
  const [rooms, setRooms] = useState([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  
  const baseRooms = hotelRooms.map(room => ({
    id: room.id,
    name: room.title,
    maxGuests: room.maxGuests,
    guestText: `${room.maxGuests} Guests max`,
    size: room.id === "medium-suite" ? "460 sq. ft. Area" : "530 sq. ft. Area",
    originalPrice: room.id === "medium-suite" ? 5299 : 5699,
    image: room.image,
    gallery: room.gallery
  }));

  // Fetch dynamic prices on component mount
  useEffect(() => {
    const loadPrices = async () => {
      setIsLoadingPrices(true);
      try {
        const apiPrices = await fetchRoomPrices();
        
        if (apiPrices.length === 0) {
          // Hide room cards if API fails
          setRooms([]);
        } else {
          const roomsWithPrices = baseRooms.map(room => {
            const apiPrice = apiPrices.find(price => 
              mapRoomTypeToRoomId(price.roomTypeId) === room.id
            );
            
            return {
              ...room,
              price: apiPrice ? apiPrice.priceWithTax : null
            };
          }).filter(room => room.price !== null); // Only show rooms with valid prices
          
          setRooms(roomsWithPrices);
        }
      } catch (error) {
        console.error('Failed to load dynamic prices:', error);
        setRooms([]);
      } finally {
        setIsLoadingPrices(false);
      }
    };
    
    loadPrices();
  }, []);

  // Hotel images
  const hotelImages = [
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1591088398332-8a7791972843?q=80&w=2067&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop"
  ];

  // Reviews
  const reviews = [
    {
      id: "review1",
      rating: 5,
      text: "I liked the hotel and the service! I came to Buteak Hotel for the first time. And I very much liked the hotel and the room and the service. The hotel staff was always asking me if I needed anything.",
      author: "Explorer0735",
      userIcon: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      id: "review2",
      rating: 5,
      text: "Awesome service and cleaning! Excellent housekeeping ensure the place is always clean and welcoming. Good service and hygienic room, all things are very good, nice response from staff.",
      author: "Tourist0131",
      userIcon: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      id: "review3",
      rating: 5,
      text: "I have visited the Buteak hotel for the first time. I loved the stay with them. Right from the check-in, it was wonderful experience. The room looked very nice and the staff was friendly.",
      author: "Explorer7277",
      location: "New York"
    },
    {
      id: "review4",
      rating: 5,
      text: "The hotel stay is very comfortable, the staff housekeeping was very helpful in the room and neat and clean, my room and stay was very pleasant and good experience.",
      author: "Road19080",
      location: "London"
    }
  ];

  // Transportation options
  const transportOptions = [
    {
      type: "airport" as const,
      name: "International Airport",
      distance: "41.5 km",
      time: "70 mins"
    },
    {
      type: "train" as const,
      name: "City Junction",
      distance: "10.3 km",
      time: "35 mins"
    },
    {
      type: "bus" as const,
      name: "Metro Stop",
      distance: "0.25 km",
      time: "3 mins"
    }
  ];

  // Nearby places
  const nearbyPlaces = [
    {
      category: "Night Life",
      count: 1,
      icon: <Circle className="h-6 w-6" />
    },
    {
      category: "Attractions",
      count: 2,
      icon: <Circle className="h-6 w-6" />
    },
    {
      category: "Restaurants",
      count: 1,
      icon: <Circle className="h-6 w-6" />
    }
  ];

  // FAQs
  const faqs = [
    {
      question: " What type of accommodation does Buteak Suites offer?",
      answer: "Buteak Suites offers thoughtfully designed, fully furnished suites that combine the comfort of home with the service of a hotel. Each suite includes plush bedding, premium linens, luxury bath amenities, and essential conveniences like high-speed WiFi, smart 43-inch TVs, refrigerators, microwaves, and electric kettles."
    },
    {
      question: " What makes Buteak Suites unique compared to other stays in Bengaluru?",
      answer: "Buteak Suites stands out for its blend of apartment-style living with hotel-grade services. Guests enjoy meticulously clean and elegant spaces, modern comforts with seamless self-check-in, and personalized touches like premium bath amenities and in-room beverages, all set in a prime location that connects you to the city's key attractions."
    },
    {
      question: "Is Buteak Suites suitable for business travelers?",
      answer: " Absolutely. Buteak Suites is designed for both business and leisure travelers. The property offers high-speed WiFi, quiet work-friendly environments, and proximity to major tech parks and business districts like Koramangala and HSR Layout."
    },
    {
      question: "How close is Buteak Suites to popular landmarks and facilities?",
      answer: "VFS Visa Office, Gopalan Mall – 0.2 km (5 mins walk) Vega City Mall & Fun City – 1.2 km(5 min drive) Jayanagar shopping district – 2 km(10 mins) Koramangala nightlife – 3 km(15 mins) HSR Layout – 2.5 km(10 mins drive) Manipal Hospital Jayanagar – 1.2 km,    Apollo Speciality Hospital Jayanagar – 3 km"
    },
    {
      question: "What amenities can I expect during my stay?",
      answer: "Guests can enjoy premium bedding, Dove bath amenities, in-room refrigerators, microwaves, electric kettles, Tata Tea or Nescafé, smart TVs, and high-speed WiFi. We also offer smooth self-check-in for added convenience."
    },
    {
      question: "Does Buteak Suites support long stays or family stays?",
      answer: "Yes, Buteak Suites is perfect for solo travelers, families, groups of friends, or business colleagues. Our flexible living spaces are designed to make every stay — short or extended — feel comfortable, spacious, and homely."
    },
    {
      question: "Is parking available at the property?",
      answer: "Currently, parking options may be limited. Kindly contact our front desk or reservations team prior to your visit to check availability and nearby parking assistance."
    }
  ];

  // Hotel highlights for carousel
  const hotelHighlights = [
    {
      title: "Luxury Comfort",
      description: "Experience premium bedding and room amenities for ultimate relaxation",
      image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?q=80&w=2070&auto=format&fit=crop"
    },
    {
      title: "Fine Dining",
      description: "Enjoy gourmet cuisine prepared by our award-winning chefs",
      image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop"
    },
    {
      title: "Wellness & Spa",
      description: "Rejuvenate with our premium spa treatments and facilities",
      image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=2070&auto=format&fit=crop"
    },
    {
      title: "Premium Bathrooms",
      description: "Indulge in luxury with our premium bathroom fixtures and amenities",
      image: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?q=80&w=2070&auto=format&fit=crop"
    }
  ];
  // Amenity to Icon mapping
  const amenityIcons: { [key: string]: JSX.Element } = {
    "Free WiFi": <Wifi size={18} className="text-hotel-accent" />,
    // "Swimming Pool": <SwimmingPool size={18} className="text-hotel-accent" />,
    "Fitness Center": <Dumbbell size={18} className="text-hotel-accent" />,
    // "Spa": <Spa size={18} className="text-hotel-accent" />,
    "Restaurant": <Utensils size={18} className="text-hotel-accent" />,
    "Room Service": <ConciergeBell size={18} className="text-hotel-accent" />,
    "Concierge": <ConciergeBell size={18} className="text-hotel-accent" />,
    // "Laundry Service": <Laundry size={18} className="text-hotel-accent" />,
    "Parking": <ParkingCircle size={18} className="text-hotel-accent" />,
    "Airport Shuttle": <Plane size={18} className="text-hotel-accent" />,
    "Business Center": <Briefcase size={18} className="text-hotel-accent" />,
    "Meeting Rooms": <Users size={18} className="text-hotel-accent" />,
  };

  const amenities = [
    "Free WiFi", "Swimming Pool", "Fitness Center", "Spa", "Restaurant", "Room Service",
    "Concierge", "Laundry Service", "Parking", "Airport Shuttle", "Business Center", "Meeting Rooms"
  ];
  // Handle room click - now navigate to room detail page instead of opening modal
  const handleRoomClick = (room: any) => {
    navigate(`/hotel-room/${room.id}`);
  };

  const phoneNumber = '+91 9993177238';
  const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

  const handleWhatsAppClick = () => {
    window.open(`https://live.ipms247.com/booking/book-rooms-buteaksuites-lf`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section with Hotel Info */}
      <HotelImageGallery
        images={hotelImages}
        title={hotel.name}
        rating={hotel.rating}
        location={hotel.location}
      // price={hotel.price}
      />

      {/* Navigation Tabs */}
      <div className="border-b sticky top-0 bg-white z-30">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          <Tabs value={selectedTab} onValueChange={handleTabChange}>
            <TabsList className="flex justify-start w-full border-b-0 bg-transparent overflow-x-auto">
              <TabsTrigger
                value="rooms"
                className="flex items-center text-hotel-primary gap-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FFCF0D] ata-[state=active]:text-[#D4A437] data-[state=active]:bg-transparent text-hotel-body"
              >
                <BedDouble size={18} />
                Rooms
              </TabsTrigger>
              <TabsTrigger
                value="amenities"
                className="flex items-center text-hotel-primary gap-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FFCF0D] data-[state=active]:bg-transparent text-hotel-body"
              >
                <ShowerHead size={18} />
                Amenities
              </TabsTrigger>
              {/* <TabsTrigger
                value="reviews"
                className="flex items-center text-hotel-primary gap-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FFCF0D] data-[state=active]:bg-transparent text-hotel-body"
              >
                <StarIcon size={18} />
                Reviews
              </TabsTrigger> */}
              <TabsTrigger
                value="location"
                className="flex items-center text-hotel-primary gap-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FFCF0D] data-[state=active]:bg-transparent text-hotel-body"
              >
                <MapPin size={18} />
                Location
              </TabsTrigger>
              <TabsTrigger
                value="highlights"
                className="flex items-center text-hotel-primary gap-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FFCF0D] data-[state=active]:bg-transparent text-hotel-body"
              >
                <Circle size={18} />
                Highlights
              </TabsTrigger>
              <TabsTrigger
                value="faqs"
                className="flex items-center text-hotel-primary gap-2 px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-[#FFCF0D] data-[state=active]:bg-transparent text-hotel-body"
              >
                <HelpCircle size={18} />
                FAQs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content Sections */}
      <div id="rooms" ref={roomsRef} className="pt-8 pb-12 bg-[#f8f8f8]">
        <div className="container bg-[#ffffff] py-8 mx-auto px-4 md:px-6 max-w-7xl">
          <h2 className="text-2xl font-bold text-[#d4a437] mb-8">Rooms</h2>
          {isLoadingPrices ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hotel-accent mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Loading Room Information</h3>
              <p className="text-gray-500">Fetching current pricing and availability...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Room Information Unavailable</h3>
              <p className="text-gray-500">We're currently unable to fetch room pricing. Please try again later or contact us directly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => (
              // <Link to={`/hotel-room/${roomId}`} className="no-underline" key={room.id}>
              <Card key={room.id} className="overflow-hidden border h-full border-gray-200" onClick={() => handleRoomClick(room)}>
                <div className="flex  flex-col md:flex-row h-full">
                  <div className="relative h-48 md:h-64 md:w-80 cursor-pointer overflow-hidden">
                    <ImageCarousel
                      images={room.gallery || [room.image]}
                      alt={room.name}
                      className="w-full h-full"
                      autoSlide={true}
                      slideInterval={5000}
                    />
                  </div>
                  <div className="p-6 flex flex-col">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{room.name}</h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center text-gray-600">
                        <Users size={16} className="mr-2 text-[#FFCF0D]" />
                        <span className="text-sm">{room.guestText}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin size={16} className="mr-2 text-[#FFCF0D]" />
                        <span className="text-sm">{room.size}</span>
                      </div>
                    </div>

                    <div className="">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-4">
                        <div>
                          <div className="flex items-baseline">
                            <div className="text-xl font-bold">₹{room.price}</div>
                          </div>
                          <div className="text-gray-500 text-sm">Incl. of taxes</div>
                        </div>

                        <Button onClick={(e) => {
                          e.stopPropagation();
                          handleRoomClick(room);
                        }} className="mt-4 md:mt-0 bg-[#d4a437] py-4 px-6 h-[5px] text-[#0b3c49] rounded-full hover:bg-[#FFCF0D]/90">
                          Book
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
                // </Link>
              ))}
            </div>
          )}

          {/* Check-in/out Info */}
          < div className="mt-12 pt-8 border-t border-gray-200" >
            <div className="flex flex-col md:flex-row justify-start items-start gap-2">
              <div>
                <p className="text-gray-600">Check-in</p>
                <p className="text-xl font-bold">2:00pm</p>
              </div>
              <div>
                <p className="text-gray-600">Check-out</p>
                <p className="text-xl font-bold">11:00am</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Book directly to request Early Check-in / Late Check-out, as per availability.
            </p>
          </div>
        </div>
      </div>

      {/* Amenities Section */}
      <div id="amenities" ref={amenitiesRef} className="py-8 bg-[#f8f8f8]">
        <div className="container bg-[#ffffff] py-8 mx-auto bg-gray-50  px-4 md:px-6 max-w-7xl">
          <h2 className="text-2xl font-bold  text-[#d4a437] mb-2">Hotel Amenities</h2>
          <p className="text-gray-500 text-[16px] mb-8">Experience luxurious comfort with our premium amenities designed for your convenience.</p>

          {/* <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {["Free WiFi", "Swimming Pool", "Fitness Center", "Spa", "Restaurant", "Room Service",
              "Concierge", "Laundry Service", "Parking", "Airport Shuttle", "Business Center", "Meeting Rooms"].map((amenity, index) => (
                <div key={index} className="flex items-left flex-col gap-3 p-4 bg-white rounded-md shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-hotel-accent/20 flex items-center justify-center">
                    <Circle size={18} className="text-hotel-accent" />
                  </div>
                  <span className='text-gray-500 text-[15px]'>{amenity}</span>
                </div>
              ))}
          </div> */}


          <div className="grid grid-cols-3 m:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {amenities.map((amenity, index) => (
              <div key={index} className="flex items-left flex-col gap-3 p-4 bg-white rounded-md shadow-sm">
                <div className="w-10 h-10 rounded-full bg-hotel-accent/20 flex items-center justify-center">
                  {amenityIcons[amenity] || <Circle size={18} className="text-hotel-accent" />}
                </div>
                <span className="text-gray-500 text-[15px]">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      {/* <div id="reviews" ref={reviewsRef} className="py-8 bg-[#f8f8f8]">
        <div className="mx-auto py-8 max-w-7xl">
          <HotelReviews reviews={reviews} />
        </div>
      </div> */}

      {/* Location Section */}
      <div id="location" ref={locationRef} className="bg-[#f8f8f8] py-8">
        <div className="container bg-[#ffffff] py-8 mx-auto px-4 md:px-6 max-w-7xl">
          <HotelLocation
            address="13/14, BTM Layout Stage 2, G.N.R Apartment #12, 1st B Main Rd, Mico Layout, Bengaluru 560076"
            mapImageUrl="https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/77.5946,12.9716,12,0/600x300?access_token=pk.eyJ1IjoibG92YWJsZWRldmFpIiwiYSI6ImNsbnUyaG0zdzAxN3Myam8zYmJtbHo0ZTEifQ.a-fCv7CxHlYVwUErdrYmyw"
            transportOptions={transportOptions}
            nearbyPlaces={nearbyPlaces}
          />
        </div>
      </div>

      {/* Highlights Section */}
      {/* <div id="highlights" ref={highlightsRef} className="bg-[#f8f8f8] py-8">
        <div className="container bg-[#ffffff] mx-auto py-8 px-4 md:px-6 max-w-7xl">
          <HotelHighlightsCarousel highlights={hotelHighlights} />
          <div className="space-y-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-2xl font-bold text-[#d4a437] mb-4">About Buteak Suites – BTM Layout</h3>
              <p className="text-gray-500 text-[16px] mb-4">
                Nestled in the vibrant heart of Bengaluru, Buteak Suites offers a refined stay experience blending the warmth of apartment living with the sophistication of hotel hospitality.
                Buteak Suites is your premium destination for a peaceful and stylish stay, whether you’re traveling for business or leisure.


              </p>
              <p className="text-gray-500 text-[16px]">
                Our thoughtfully designed suites are crafted for comfort and flexibility. Guests enjoy spacious layouts, plush bedding, premium linens, luxurious bath amenities,
                and essential conveniences like high-speed WiFi, smart 43 inch TVs, In-room refrigerators, microwaves, and electric kettles — ensuring you feel right at home, with the care you’d expect from a five-star hotel.
              </p>

            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-2xl font-bold text-[#d4a437] mb-4">Why Choose Buteak?</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-l font-bold text-hotel-primary group-hover:text-hotel-accent transition-colors">Pristine, Elegant Spaces </h4>
                  <p className="text-gray-500 text-[16px]">
                    We believe your stay should be spotless and serene. Each suite is meticulously cleaned and maintained, with elegant interiors designed to provide a restful, premium experience.
                  </p>
                </div>
                <div>
                  <h4 className="text-l font-bold  text-hotel-primary group-hover:text-hotel-accent transition-colors">Modern Comfort, Seamless Convenience
                  </h4>
                  <p className="text-gray-500 text-[16px]">
                    From smooth self-check-in to thoughtful amenities, everything at Buteak Suites works beautifully — so you can focus on enjoying your stay.
                    Whether unwinding after a long day or preparing for a busy morning, our suites offer the ultimate blend of comfort and function.
                  </p>
                </div>
                <div>
                  <h4 className="text-l font-bold text-hotel-primary group-hover:text-hotel-accent transition-colors"> Prime Location in Bengaluru </h4>
                  <p className="text-gray-500 text-[16px]">
                    Perfectly situated in BTM Layout, just minutes from Jayanagar, HSR Layout, and Koramangala, Buteak Suites places you close to Bengaluru’s best restaurants, shopping hubs, tech parks, and entertainment centers.
                    Easy access means you can explore the city effortlessly.

                  </p>
                </div>
                <div>
                  <h4 className="text-l font-bold text-hotel-primary group-hover:text-hotel-accent transition-colors"> Thoughtful Touches</h4>
                  <p className="text-gray-500 text-[16px]">
                    Start your day with the little comforts that matter: a fresh cup of Tata Tea or Nescafé, soft premium towels, and indulgent Dove bath amenities.
                    We’ve taken care of the details, so you can focus on what matters most.
                  </p>
                </div>
                <div>
                  <h4 className="text-l font-bold text-hotel-primary group-hover:text-hotel-accent transition-colors"> Perfect for Every Traveler</h4>
                  <p className="text-gray-500 text-[16px]">
                    Whether you’re staying solo, traveling with family, hosting colleagues, or reuniting with friends, Buteak Suites offers flexible living spaces tailored to your needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> */}
      <div className="space-y-6" id="highlights" ref={highlightsRef}>
        <div className="container bg-[#ffffff] mx-auto py-8 px-4 md:px-6 max-w-7xl">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-[#d4a437] mb-4">Explore Around Buteak Suites</h3>
            <motion.div>
              <motion.li>VFS Visa Office, Gopalan Mall–(0.2 km) 5 mins walk</motion.li>
              <motion.li>HSR Layout- 2.5 km, 10 min drive</motion.li>
              <motion.li>Vega City Mall & Fun City –(1.2 km) 5 min drive</motion.li>
              <motion.li>Jayanagar shopping district – (2 km)  10 mins</motion.li>
              <motion.li>Koramangala nightlife – (3 km) 15 mins</motion.li>
              <motion.li><span className='font-bold'>Hospitals:</span> Manipal Hospital Jayanagar (1.2 km), Apollo Speciality Hospital Jayanagar (3 km)</motion.li>
            </motion.div>
          </div>
        </div>
      </div>
      {/* FAQs Section */}
      <div id="faqs" ref={faqsRef} className="bg-[#f8f8f8] py-8">
        <div className="container bg-[#ffffff] mx-auto py-8 px-4 md:px-6 max-w-7xl">
          <HotelFAQ faqs={faqs} />
        </div>
      </div>
      <Footer />
    </div >
  );
};

export default HotelPage;
