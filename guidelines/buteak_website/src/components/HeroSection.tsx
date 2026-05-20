
import { useState, useRef, useEffect } from 'react';

const HeroSection = () => {
  // Luxury hotel images for the auto-looping background

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRefs = [useRef(null), useRef(null)];
  const [activeIndex, setActiveIndex] = useState(0);

  const [halfHotelCurrentVideoIndex, setHalfHotelCurrentVideoIndex] = useState(0);
  const halfHotelVideoRefs = [useRef(null), useRef(null)];
  const [halfHotelActiveIndex, setHalfHotelActiveIndex] = useState(0);

  const halfApartment = [
    // "images/Apartment/hero-banner1.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Apartment/1.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Apartment/2.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Apartment/3.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Apartment/4.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Apartment/5.mp4",

  ];

  const halfHotel = [
    "https://d1l9ecif91hu4p.cloudfront.net/Hotel/1.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Hotel/2.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Hotel/3.mp4",
    "https://d1l9ecif91hu4p.cloudfront.net/Hotel/4.mp4",

  ];

  // 👇 Apartment Video End Handler
  const handleApartmentEnded = () => {
    const nextIndex = (currentVideoIndex + 1) % halfApartment.length;
    const nextRef = videoRefs[1 - activeIndex].current;

    nextRef.src = halfApartment[nextIndex];
    nextRef.load();
    nextRef.play();

    setTimeout(() => {
      setCurrentVideoIndex(nextIndex);
      setActiveIndex(1 - activeIndex);
    }, 100); // Adjusted for smoother transition
  };

  // 👇 Hotel Video End Handler
  const handleHotelEnded = () => {
    const nextIndex = (halfHotelCurrentVideoIndex + 1) % halfHotel.length;
    const nextRef = halfHotelVideoRefs[1 - halfHotelActiveIndex].current;

    nextRef.src = halfHotel[nextIndex];
    nextRef.load();
    nextRef.play();

    setTimeout(() => {
      setHalfHotelCurrentVideoIndex(nextIndex);
      setHalfHotelActiveIndex(1 - halfHotelActiveIndex);
    }, 100); // Adjusted for smoother transition
  };


  // ▶️ Initial video setup for Apartment
  useEffect(() => {
    const ref = videoRefs[0].current;
    if (ref) {
      ref.src = halfApartment[0];
      ref.load();
      ref.play();
    }
  }, []);

  // ▶️ Initial video setup for Hotel
  useEffect(() => {
    const ref = halfHotelVideoRefs[0].current;
    if (ref) {
      ref.src = halfHotel[0];
      ref.load();
      ref.play();
    }
  }, []);


  return (
    <div className="relative h-[55vh] md:h-[62vh] ">
      {/* Dynamic background images with transitions */}

      <div className="absolute inset-0 z-0 flex flex-col md:flex-row h-full">
        {/* Left: Half Apartment */}
        <div className="relative w-full md:w-1/2 h-1/2 md:h-full overflow-hidden">
          {[0, 1].map((i) => (
            <video
              key={`apt-${i}`}
              ref={videoRefs[i]}
              autoPlay
              muted
              playsInline
              onEnded={handleApartmentEnded}
              className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${activeIndex === i ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
            />
          ))}
          <div className="absolute top-0 left-0 inset-0 flex gap-2 items-center justify-center">
            <div className="max-w-5xl z-index animate-fade-in">
              <div className='web_view'>
                <img src="images/logo-flower.svg" alt="brand logo" className="web_view" />
              </div>
              <div className='mobile_view'>
                <img src="images/logo-flower.svg" alt="brand logo" className="mobile_view" />
              </div>
            </div>
            <h1 className="text-white z-index text-shadow text-[32px] md:text-4xl lg:text-[64px] font-bold md:font-medium font-schibsted">
              Half Apartment
            </h1>
          </div>
        </div>

        {/* Right: Half Hotel */}
        <div className="relative w-full md:w-1/2 h-1/2 md:h-full overflow-hidden">
          {[0, 1].map((i) => (
            <video
              key={`hotel-${i}`}
              ref={halfHotelVideoRefs[i]}
              autoPlay
              muted
              playsInline
              onEnded={handleHotelEnded}
              className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-500 ${halfHotelActiveIndex === i ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
            />
          ))}
          <div className="absolute inset-0 flex gap-2 items-center justify-center bg-black/30">
            <div className="max-w-5xl z-index animate-fade-in">
              <div className='web_view'>
                <img src="images/logo-flower.svg" alt="brand logo" />
              </div>
              <div className='mobile_view'>
                <img src="images/logo-flower.svg" alt="brand logo" />
              </div>
            </div>
            <h1 className="text-white z-index text-shadow text-[32px] md:text-4xl lg:text-[64px] font-bold md:font-medium font-schibsted">
              Half Hotel
            </h1>
          </div>
        </div>
      </div>
    </div >
  );
};

export default HeroSection;
