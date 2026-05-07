import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Calendar, Users, ArrowRight, Star, Wifi, Coffee, Lock, Zap, Wind, Utensils, Droplet, MapPin, CheckCircle2, Shield, Snowflake, Clock, Package, Instagram } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import Navigation from '../components/Navigation';
import useEmblaCarousel from 'embla-carousel-react';
import StarBorder from '../components/StarBorder';

export default function LandingPage() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const heroImages = [
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920',
    'https://images.unsplash.com/photo-1694151569569-8288e3118519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920',
    'https://images.unsplash.com/photo-1641352848574-9dbb6a244a32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920',
    'https://images.unsplash.com/photo-1647649644192-af6183269fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920'
  ];

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    
    // Auto-scroll every 5 seconds
    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => {
      clearInterval(interval);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="bg-[#230f14] min-h-screen w-full">
      <Navigation />
      
      {/* 1. Hero Section with Image Carousel */}
      <section className="relative min-h-[80vh] md:min-h-[90vh] overflow-hidden">
        {/* Image Carousel Background */}
        <div className="absolute inset-0" ref={emblaRef}>
          <div className="flex h-full">
            {heroImages.map((img, idx) => (
              <div key={idx} className="flex-[0_0_100%] min-w-0 relative">
                <ImageWithFallback
                  src={img}
                  alt={`The Daily Social ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[rgba(35,15,20,0.7)] to-[rgba(35,15,20,0.9)]" />
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === selectedIndex ? 'bg-[#c62828] w-8' : 'bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-4 md:px-6 pt-16 pb-24 h-full">
          {/* Main Tagline */}
          <div className="max-w-[1000px] px-4 mb-12">
            <h1 className="font-['Space_Grotesk'] font-bold text-[48px] md:text-[80px] lg:text-[96px] text-center uppercase leading-[50px] md:leading-[80px] lg:leading-[100px]">
              <span className="inline-block bg-gradient-to-r from-white via-[#f1f5f9] to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                STAY
              </span>
              {' '}
              <span className="inline-block relative">
                <span className="absolute inset-0 blur-xl bg-[#c62828] opacity-50"></span>
                <span className="relative bg-gradient-to-r from-[#c62828] via-[#8e1b1b] to-[#c62828] bg-clip-text text-transparent animate-pulse">
                  MIX
                </span>
              </span>
              <br />
              <span className="inline-block bg-gradient-to-r from-white via-[#f1f5f9] to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                REPEAT
              </span>
            </h1>
          </div>

          {/* Primary Booking Widget */}
          <div id="hero-booking-widget" className="bg-white p-5 md:p-6 rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] max-w-[420px] md:max-w-[520px] w-full border-2 border-[#c62828]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <label className="font-['Space_Grotesk'] font-bold text-[10px] text-[#0f172a] uppercase tracking-[1px] mb-2 block">
                    Check-In
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#cbd5e1] rounded-[4px] font-['Space_Grotesk'] text-[14px] focus:border-[#c62828] focus:outline-none"
                  />
                </div>
                <div className="text-center">
                  <label className="font-['Space_Grotesk'] font-bold text-[10px] text-[#0f172a] uppercase tracking-[1px] mb-2 block">
                    Check-Out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#cbd5e1] rounded-[4px] font-['Space_Grotesk'] text-[14px] focus:border-[#c62828] focus:outline-none"
                  />
                </div>
              </div>
              <button className="w-full bg-[#c62828] px-8 md:px-10 py-3 md:py-4 rounded-[2px] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] transition-all">
                <span className="font-['Space_Grotesk'] font-bold text-[16px] md:text-[18px] text-white uppercase leading-[28px]">
                  Book Now
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust & Assurances Grid - "Stay With Confidence" */}
      <section id="trust-assurances" className="px-4 md:px-6 py-10 md:py-12">
        <h2 className="font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] lg:text-[36px] text-white tracking-[-1.5px] uppercase leading-[30px] md:leading-[36px] text-center mb-2">
          Stay With Confidence
        </h2>
        <p className="font-['Playfair_Display'] text-[14px] md:text-[16px] text-[rgba(255,255,255,0.8)] text-center mb-8 italic">
          your safety is our priority
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-screen-lg mx-auto">
          {[
            { icon: <Droplet className="w-6 md:w-8 h-6 md:h-8" />, label: 'Clean Rooms', color: '#00d1ff' },
            { icon: <Shield className="w-6 md:w-8 h-6 md:h-8" />, label: 'Safe & Secure', color: '#c62828' },
            { icon: <Snowflake className="w-6 md:w-8 h-6 md:h-8" />, label: 'AC Dorms', color: '#39ff14' },
            { icon: <Clock className="w-6 md:w-8 h-6 md:h-8" />, label: '24/7 Reception', color: '#facc15' },
            { icon: <Lock className="w-6 md:w-8 h-6 md:h-8" />, label: 'Secure Lockers', color: '#c62828' },
            { icon: <CheckCircle2 className="w-6 md:w-8 h-6 md:h-8" />, label: '7-Day Cancel', color: '#39ff14' },
          ].map((item, idx) => (
            <StarBorder
              key={idx}
              color={item.color}
              speed="5s"
              className="w-full"
              style={{ transform: idx % 2 === 0 ? 'rotate(-1deg)' : 'rotate(1deg)' }}
            >
              <div className="flex justify-center mb-2 md:mb-3" style={{ color: item.color }}>
                {item.icon}
              </div>
              <p className="font-['Space_Grotesk'] font-bold text-[12px] md:text-[14px] text-white uppercase leading-[18px] md:leading-[20px]">
                {item.label}
              </p>
            </StarBorder>
          ))}
        </div>
      </section>

      {/* 3. Amenities Carousel */}
      <section id="amenities" className="px-4 md:px-6 py-10 md:py-12 bg-[rgba(255,255,255,0.02)]">
        <h2 className="font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] text-white tracking-[-1.5px] uppercase leading-[30px] md:leading-[36px] text-center mb-2">
          Amenities
        </h2>
        <p className="font-['Playfair_Display'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-8 italic">
          everything you need
        </p>

        <div className="flex flex-wrap gap-3 justify-center max-w-screen-lg mx-auto">
          {[
            { icon: <Wifi className="w-5 h-5" />, label: 'Fast Wi-Fi', color: '#00d1ff' },
            { icon: <Droplet className="w-5 h-5" />, label: 'Hot Showers', color: '#c62828' },
            { icon: <Coffee className="w-5 h-5" />, label: 'Co-working', color: '#facc15' },
            { icon: <Package className="w-5 h-5" />, label: 'Laundry', color: '#39ff14' },
            { icon: <Wind className="w-5 h-5" />, label: 'AC', color: '#00d1ff' },
            { icon: <Utensils className="w-5 h-5" />, label: 'Kitchen', color: '#c62828' },
            { icon: <MapPin className="w-5 h-5" />, label: 'Central Location', color: '#facc15' },
            { icon: <Lock className="w-5 h-5" />, label: 'Lockers', color: '#39ff14' },
          ].map((amenity, idx) => (
            <div
              key={idx}
              className="bg-[rgba(255,255,255,0.1)] border-2 border-[rgba(255,255,255,0.3)] rounded-[12px] px-4 md:px-5 py-2 md:py-3 flex items-center gap-2 hover:border-white transition-colors"
              style={{ transform: `rotate(${(idx % 3 - 1) * 2}deg)` }}
            >
              <div style={{ color: amenity.color }}>{amenity.icon}</div>
              <span className="font-['Space_Grotesk'] font-bold text-[11px] md:text-[12px] text-white uppercase">
                {amenity.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Rooms Overview */}
      <section id="rooms-overview" className="px-4 md:px-6 py-10 md:py-12">
        <h2 className="font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] text-white tracking-[-1.5px] uppercase leading-[30px] md:leading-[36px] text-center mb-2">
          Our Rooms
        </h2>
        <p className="font-['Playfair_Display'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-8 italic">
          find your corner
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-screen-lg mx-auto">
          {[
            {
              title: '4-Bed Mixed Dorm',
              price: '₹599',
              capacity: '4 Guests',
              image: 'https://images.unsplash.com/photo-1694151569569-8288e3118519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
              badge: 'Most Popular',
              badgeColor: '#c62828',
              badgeTextColor: '#ffffff'
            },
            {
              title: '4-Bed Female Dorm',
              price: '₹599',
              capacity: '4 Guests',
              image: 'https://images.unsplash.com/photo-1626265774643-f1943311a86b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
              badge: 'Safe Space',
              badgeColor: '#39ff14',
              badgeTextColor: '#0f172a'
            },
            {
              title: 'Private Room',
              price: '₹1,299',
              capacity: '2 Guests',
              image: 'https://images.unsplash.com/photo-1721522281545-fad32dd5107a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800',
              badge: 'Privacy',
              badgeColor: '#00d1ff',
              badgeTextColor: '#0f172a'
            },
          ].map((room, idx) => (
            <div
              key={idx}
              className="bg-[#1e293b] border-2 border-[#334155] rounded-[8px] overflow-hidden shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] hover:border-[#c62828] transition-all relative"
              style={{ transform: `rotate(${idx % 2 === 0 ? -0.5 : 0.5}deg)` }}
            >
              {room.badge && (
                <div
                  className="absolute top-3 left-3 z-10 px-3 py-1 rounded-[2px] border-2 border-[#0f172a]"
                  style={{ backgroundColor: room.badgeColor }}
                >
                  <span className="font-['Space_Grotesk'] font-bold text-[10px] uppercase" style={{ color: room.badgeTextColor }}>
                    {room.badge}
                  </span>
                </div>
              )}
              <div className="h-[200px] overflow-hidden">
                <ImageWithFallback
                  src={room.image}
                  alt={room.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <h3 className="font-['Space_Grotesk'] font-bold text-[20px] text-white leading-[25px] mb-2">
                  {room.title}
                </h3>
                <div className="flex items-center gap-2 text-[rgba(255,255,255,0.7)] mb-4">
                  <Users className="w-4 h-4" />
                  <span className="font-['Space_Grotesk'] text-[14px]">{room.capacity}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-['Space_Grotesk'] text-[12px] text-[rgba(255,255,255,0.6)] uppercase mb-1">
                      Starting from
                    </p>
                    <p className="font-['Space_Grotesk'] font-bold text-[24px] text-[#c62828]">
                      {room.price}
                    </p>
                  </div>
                  <a
                    href="/rooms"
                    className="bg-[rgba(255,255,255,0.1)] border-2 border-[rgba(255,255,255,0.3)] px-4 py-2 rounded-[4px] font-['Space_Grotesk'] font-bold text-[12px] text-white uppercase hover:bg-[rgba(255,255,255,0.2)] transition-colors"
                  >
                    View Details
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Tonight at The Daily Social */}
      <section id="events-tonight" className="px-4 md:px-6 py-10 md:py-12 bg-[rgba(255,255,255,0.02)]">
        <h2 className="font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] text-white tracking-[-1.5px] uppercase leading-[30px] md:leading-[36px] text-center mb-2">
          Tonight at The Daily Social
        </h2>
        <p className="font-['Playfair_Display'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-8 italic">
          next 48 hours
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-screen-lg mx-auto">
          {[
            { title: 'Pub Crawl', time: 'Tonight 9PM', location: 'Meet at Lobby', color: '#c62828', badge: 'Popular' },
            { title: 'Game Night', time: 'Today 7PM', location: 'Common Area', color: '#00d1ff', badge: 'Free' },
            { title: 'Local Music', time: 'Tomorrow 8PM', location: 'Rooftop', color: '#39ff14', badge: 'Live' },
          ].map((event, idx) => (
            <div
              key={idx}
              className="bg-[#1e293b] border-2 border-[rgba(255,255,255,0.2)] rounded-[8px] p-5 relative hover:border-white transition-all"
              style={{ transform: `rotate(${idx % 2 === 0 ? -1 : 1}deg)` }}
            >
              {event.badge && (
                <div
                  className="absolute top-[-12px] right-[-8px] px-3 py-1 rounded-[12px] border-2 border-[#0f172a] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                  style={{ backgroundColor: event.color, transform: 'rotate(12deg)' }}
                >
                  <span className="font-['Space_Grotesk'] font-bold text-[10px] text-white uppercase">
                    {event.badge}
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="font-['Space_Grotesk'] font-bold text-[20px] md:text-[24px] text-white uppercase leading-[26px] md:leading-[32px] mb-2">
                  {event.title}
                </h3>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[rgba(255,255,255,0.7)]">
                    <Clock className="w-4 h-4" />
                    <span className="font-['Space_Grotesk'] text-[12px]">{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[rgba(255,255,255,0.7)]">
                    <MapPin className="w-4 h-4" />
                    <span className="font-['Space_Grotesk'] text-[12px]">{event.location}</span>
                  </div>
                </div>
              </div>
              <button
                className="w-full px-4 py-2 rounded-[4px] border-2 border-[rgba(255,255,255,0.3)] font-['Space_Grotesk'] font-bold text-[14px] text-white uppercase hover:border-white transition-colors"
                style={{ backgroundColor: `${event.color}40` }}
              >
                RSVP Now
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 6. The Daily Social Experience */}
      <section id="vibe-experience" className="px-4 md:px-6 py-10 md:py-12">
        <h2 className="font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] text-white tracking-[-1.5px] uppercase leading-[30px] md:leading-[36px] text-center mb-2">
          The Daily Social Experience
        </h2>
        <p className="font-['Playfair_Display'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-8 italic">
          why travelers choose us
        </p>

        <div className="max-w-screen-md mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* High Energy Community */}
          <div className="bg-gradient-to-br from-[#c62828] to-[#8e1b1b] p-6 rounded-[8px] border-2 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]" style={{ transform: 'rotate(-1deg)' }}>
            <div className="bg-[rgba(255,255,255,0.2)] backdrop-blur-sm rounded-[4px] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white rounded-full p-2">
                  <Zap className="w-6 h-6 text-[#c62828]" />
                </div>
                <h3 className="font-['Space_Grotesk'] font-bold text-[18px] md:text-[20px] text-white uppercase">
                  High Energy
                </h3>
              </div>
              <p className="font-['Space_Grotesk'] text-[13px] md:text-[14px] text-white leading-[20px]">
                Daily events, pub crawls, and game nights keep the energy alive. Meet travelers from around the world and create memories that last forever.
              </p>
            </div>
          </div>

          {/* Safety First */}
          <div className="bg-gradient-to-br from-[#39ff14] to-[#6fff47] p-6 rounded-[8px] border-2 border-[#0f172a] shadow-[8px_8px_0px_0px_rgba(15,23,42,0.3)]" style={{ transform: 'rotate(1deg)' }}>
            <div className="bg-[rgba(0,0,0,0.1)] backdrop-blur-sm rounded-[4px] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#0f172a] rounded-full p-2">
                  <Shield className="w-6 h-6 text-[#39ff14]" />
                </div>
                <h3 className="font-['Space_Grotesk'] font-bold text-[18px] md:text-[20px] text-[#0f172a] uppercase">
                  Safety First
                </h3>
              </div>
              <p className="font-['Space_Grotesk'] text-[13px] md:text-[14px] text-[#0f172a] leading-[20px]">
                24/7 security, CCTV coverage, secure lockers, and verified staff ensure your peace of mind. Clean facilities sanitized daily.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Guest Energy - Social Media */}
      <section id="guest-energy" className="px-4 md:px-6 py-10 md:py-12 bg-[#171112]">
        <h2 className="font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] text-white tracking-[-1.5px] uppercase leading-[30px] md:leading-[36px] text-center mb-2">
          The Energy
        </h2>
        <p className="font-['Playfair_Display'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-8 italic">
          see what's happening
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-screen-lg mx-auto mb-8">
          {[
            'https://images.unsplash.com/photo-1681747971522-2d7a04c78321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1710144994421-a41e387e71c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1766113491996-19167a988455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
            'https://images.unsplash.com/photo-1647649644192-af6183269fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
          ].map((img, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-[4px] overflow-hidden border-4 border-white shadow-[8px_8px_0px_0px_#c62828] hover:shadow-[12px_12px_0px_0px_#c62828] transition-all cursor-pointer"
              style={{ transform: `rotate(${(idx % 2 === 0 ? -2 : 2)}deg)` }}
            >
              <ImageWithFallback
                src={img}
                alt={`Guest energy ${idx + 1}`}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button className="bg-gradient-to-r from-[#c62828] to-[#8e1b1b] px-8 py-4 rounded-[12px] border-2 border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] flex items-center gap-3 hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.3)] transition-all">
            <Instagram className="w-6 h-6 text-white" />
            <span className="font-['Space_Grotesk'] font-bold text-[18px] text-white uppercase">
              @thedailysocial
            </span>
          </button>
        </div>
      </section>

      {/* 8. Social Proof - Guest Reviews */}
      <section id="guest-reviews" className="px-4 md:px-6 py-10 md:py-12 bg-[#1d1718]">
        <h2 className="font-['Space_Grotesk'] font-bold text-[24px] md:text-[30px] text-white tracking-[-1.5px] uppercase leading-[30px] md:leading-[36px] text-center mb-2">
          Guest Stories
        </h2>
        <p className="font-['Playfair_Display'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-8 italic">
          what travelers say
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-screen-lg mx-auto">
          {[
            {
              name: 'Sarah M.',
              country: 'Australia',
              rating: 5,
              review: 'Best hostel experience ever! The staff was amazing and I met so many cool people. The cleanliness is top-notch!',
              avatar: 'https://images.unsplash.com/photo-1622646771382-1c9c090d3c37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200'
            },
            {
              name: 'Marco R.',
              country: 'Italy',
              rating: 5,
              review: 'The events were incredible! Pub crawl was so much fun. Great vibes, great people, great location.',
              avatar: null
            },
            {
              name: 'Yuki T.',
              country: 'Japan',
              rating: 5,
              review: 'Felt safe the entire stay. Female dorms are perfect. WiFi is super fast for remote work. Will come back!',
              avatar: null
            },
          ].map((review, idx) => (
            <div
              key={idx}
              className="bg-[#1e293b] border-2 border-[#334155] rounded-[8px] p-5 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] hover:border-[#c62828] transition-all"
              style={{ transform: `rotate(${idx % 2 === 0 ? -0.5 : 0.5}deg)` }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#334155] flex items-center justify-center flex-shrink-0">
                  {review.avatar ? (
                    <ImageWithFallback
                      src={review.avatar}
                      alt={review.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-['Space_Grotesk'] font-bold text-[20px] text-white">
                      {review.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-['Space_Grotesk'] font-bold text-[16px] text-white">
                    {review.name}
                  </p>
                  <p className="font-['Space_Grotesk'] text-[12px] text-[rgba(255,255,255,0.6)]">
                    {review.country}
                  </p>
                </div>
                <div className="flex gap-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#facc15] text-[#facc15]" />
                  ))}
                </div>
              </div>
              <p className="font-['Space_Grotesk'] text-[13px] md:text-[14px] text-[rgba(255,255,255,0.9)] leading-[20px] italic">
                "{review.review}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Final CTA - Secondary Booking Widget */}
      <section id="final-cta" className="px-4 md:px-6 py-10 md:py-12 bg-[rgba(255,255,255,0.02)]">
        <div className="bg-gradient-to-br from-[#c62828] via-[#8e1b1b] to-[#c62828] p-6 md:p-8 rounded-[12px] border-4 border-white shadow-[12px_12px_0px_0px_rgba(255,255,255,0.3)] max-w-[500px] mx-auto" style={{ transform: 'rotate(-1deg)' }}>
          <h2 className="font-['Space_Grotesk'] font-bold text-[28px] md:text-[36px] text-white tracking-[-1.8px] uppercase leading-[34px] md:leading-[40px] text-center mb-3">
            Your Adventure Starts Here
          </h2>
          <p className="font-['Playfair_Display'] text-[14px] md:text-[16px] text-white text-center mb-6 italic">
            Join the community. Book your stay.
          </p>

          {/* Simplified Booking Widget */}
          <div className="bg-white p-5 rounded-[8px] mb-5">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input
                type="date"
                className="px-3 py-2 border-2 border-[#cbd5e1] rounded-[4px] font-['Space_Grotesk'] text-[14px] focus:border-[#c62828] focus:outline-none"
              />
              <input
                type="date"
                className="px-3 py-2 border-2 border-[#cbd5e1] rounded-[4px] font-['Space_Grotesk'] text-[14px] focus:border-[#c62828] focus:outline-none"
              />
            </div>
            <button className="w-full bg-[#c62828] px-8 py-4 rounded-[4px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] transition-all">
              <span className="font-['Space_Grotesk'] font-bold text-[16px] md:text-[18px] text-white uppercase leading-[28px] flex items-center justify-center gap-2">
                Book Now
                <ArrowRight className="w-5 h-5" />
              </span>
            </button>
          </div>

          <div className="text-center">
            <p className="font-['Space_Grotesk'] text-[11px] md:text-[12px] text-white uppercase tracking-[1px]">
              Free Cancellation • No Booking Fees
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="bg-[#0f172a] border-t-2 border-[#1e293b] px-4 md:px-6 py-8">
        <div className="max-w-screen-lg mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Brand */}
            <div>
              <h3 className="font-['Space_Grotesk'] font-bold text-[20px] text-[#c62828] uppercase tracking-[2px] mb-2">
                The Daily Social
              </h3>
              <p className="font-['Playfair_Display'] text-[14px] text-[rgba(255,255,255,0.6)] italic mb-4">
                Stay. Mix. Repeat.
              </p>
              <div className="flex gap-4">
                <Instagram className="w-6 h-6 text-[rgba(255,255,255,0.6)] hover:text-[#c62828] transition-colors cursor-pointer" />
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-['Space_Grotesk'] font-bold text-[14px] text-white uppercase tracking-[1px] mb-3">
                Contact
              </h4>
              <div className="space-y-2 text-[14px]">
                <p className="font-['Space_Grotesk'] text-[rgba(255,255,255,0.6)]">
                  123 Backpacker Street<br />Mumbai 400001
                </p>
                <p className="font-['Space_Grotesk'] text-[rgba(255,255,255,0.6)]">
                  +91 88849 73328
                </p>
                <p className="font-['Space_Grotesk'] text-[rgba(255,255,255,0.6)]">
                  thedailysocial01@gmail.com
                </p>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-['Space_Grotesk'] font-bold text-[14px] text-white uppercase tracking-[1px] mb-3">
                Legal
              </h4>
              <ul className="space-y-2">
                <li><a href="/policies/terms" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Terms & Conditions</a></li>
                <li><a href="/policies/privacy" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/policies/refund" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Cancellation Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t-2 border-[#1e293b] pt-6 text-center">
            <p className="font-['Space_Grotesk'] text-[12px] text-[rgba(255,255,255,0.4)]">
              © 2026 The Daily Social. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}