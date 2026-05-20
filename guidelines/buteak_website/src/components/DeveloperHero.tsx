
import React, { useEffect, useRef } from 'react';

const DeveloperHero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (backgroundRef.current) {
        const scrollPosition = window.scrollY;
        // Create the parallax effect by moving the background at a different rate than scroll
        backgroundRef.current.style.transform = `translateY(${scrollPosition * 0.4}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div ref={heroRef} className="relative h-[60vh] h-[75vh] md:h-[70vh] overflow-hidden">
      {/* Background with parallax effect */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 w-full h-[120%] -top-[20%] bg-cover bg-center"
        style={{
          backgroundImage: "url('images/developers-and-owners-hero-section.png')",
          zIndex: -1
        }}
      ></div>

      {/* Dark overlay for text readability */}
      {/* <div className="absolute inset-0 bg-black/60 z-0"></div> */}

      {/* Content */}
      <div className="container mx-auto px-4 py-12 md:py-0 h-full flex flex-col justify-center relative z-10">
        <div className="max-w-5xl animate-fade-in py-12 md:py-0">
          <h1 className="text-5xl text-white md:text-5xl lg:text-6xl xl:text-[80px] font-schibsted font-medium mb-4">
            Be One of a Select Few, Not Lost in the Crowd
          </h1>
          <div className="w-24 h-1 bg-hotel-accent mt-4 mb-6"></div>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-8">
            Partner with <span className="font-bold text-hotel-accent">Buteak Suites</span>, a next-generation aparthotel brand that blends apartment living with hotel finesse—offering segment-leading returns and a guest experience that drives long-term loyalty.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeveloperHero;
