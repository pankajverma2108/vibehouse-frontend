import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Users, ShieldCheck, MapPin, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

export default function AboutPage() {
  const pillars = [
    {
      icon: <Users className="w-10 h-10" />,
      title: 'Community',
      description: 'Meet travelers from around the world. Daily events and activities bring people together.',
      color: '#c62828'
    },
    {
      icon: <ShieldCheck className="w-10 h-10" />,
      title: 'Cleanliness',
      description: 'Fresh linens daily, spotless bathrooms, and professional housekeeping. Your health matters.',
      color: '#39ff14'
    },
    {
      icon: <MapPin className="w-10 h-10" />,
      title: 'Location',
      description: 'Central locations near metro, markets, and nightlife. Everything is within walking distance.',
      color: '#00d1ff'
    },
    {
      icon: <Shield className="w-10 h-10" />,
      title: 'Security',
      description: '24/7 CCTV, verified staff, secure lockers, and reception. Sleep soundly every night.',
      color: '#facc15'
    },
  ];

  return (
    <div className="bg-[#230f14] min-h-screen">
      {/* Navigation Bar */}
      <nav className="bg-[#0f172a] border-b-2 border-[#1e293b] sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-['Space_Grotesk'] font-bold text-[20px] text-[#c62828] uppercase tracking-[2px]">
              The Daily Social
            </Link>
            <div className="flex gap-6">
              <Link to="/" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                Home
              </Link>
              <Link to="/rooms" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                Rooms
              </Link>
              <Link to="/events" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                Events
              </Link>
              <Link to="/about" className="font-['Space_Grotesk'] text-[14px] text-[#c62828]">
                About
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-16 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <div className="bg-[#c62828] px-3 py-1 inline-block shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)] mb-6">
              <p className="font-['Space_Grotesk'] font-bold text-[12px] text-white tracking-[1.2px] uppercase">
                About The Daily Social
              </p>
            </div>
            
            <h1 className="font-['Space_Grotesk'] font-bold text-[48px] md:text-[60px] text-white tracking-[-2.5px] uppercase leading-[48px] md:leading-[58px] mb-6">
              More than<br />just a bed.
            </h1>
            
            <p className="font-['Liberation_Serif'] text-[18px] text-[rgba(255,255,255,0.8)] italic mb-6 leading-[28px]">
              We're building a global community of explorers, digital nomads, and adventure seekers.
            </p>

            <p className="font-['Space_Grotesk'] text-[16px] text-[rgba(255,255,255,0.9)] leading-[24px] mb-4">
              The Daily Social started with a simple idea: travel should bring people together. Not just to share a room, but to share experiences, stories, and lifelong friendships.
            </p>

            <p className="font-['Space_Grotesk'] text-[16px] text-[rgba(255,255,255,0.9)] leading-[24px]">
              Today, we operate vibrant hostels across India's most exciting cities, where backpackers, digital nomads, and solo travelers find their tribe.
            </p>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2">
            <div className="rounded-[12px] overflow-hidden border-4 border-white shadow-[12px_12px_0px_0px_rgba(198,40,40,0.5)]" style={{ transform: 'rotate(2deg)' }}>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1501566953613-d93d5cb0be93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBleHRlcmlvciUyMGJ1aWxkaW5nJTIwY29sb3JmdWx8ZW58MXx8fHwxNzczNzI5NTI1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="The Daily Social Building"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* The Daily Social Story */}
      <section className="px-6 py-16 bg-[rgba(255,255,255,0.05)]">
        <div className="max-w-screen-lg mx-auto">
          <h2 className="font-['Space_Grotesk'] font-bold text-[36px] text-white tracking-[-1.8px] uppercase leading-[40px] text-center mb-3">
            The Daily Social Story
          </h2>
          <p className="font-['Liberation_Serif'] text-[16px] text-[rgba(255,255,255,0.7)] text-center mb-12 italic">
            how we got here
          </p>

          <div className="space-y-8">
            {/* Z-Pattern 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="font-['Space_Grotesk'] font-bold text-[24px] text-[#c62828] uppercase mb-4">
                  Built by Travelers, for Travelers
                </h3>
                <p className="font-['Space_Grotesk'] text-[16px] text-[rgba(255,255,255,0.9)] leading-[24px]">
                  Our founders met in a dingy hostel in Goa in 2018. The vibe was amazing, but the facilities? Not so much. They dreamed of creating spaces that balanced high energy with high standards. Two years later, The Daily Social Mumbai opened its doors.
                </p>
              </div>
              <div className="rounded-[8px] overflow-hidden border-4 border-[#c62828] shadow-[8px_8px_0px_0px_rgba(198,40,40,0.3)]" style={{ transform: 'rotate(-1deg)' }}>
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1681747971522-2d7a04c78321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNrcGFja2VycyUyMGxhdWdoaW5nJTIwdG9nZXRoZXIlMjBob3N0ZWx8ZW58MXx8fHwxNzczNzI0Njc0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Community"
                  className="w-full aspect-video object-cover"
                />
              </div>
            </div>

            {/* Z-Pattern 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1 rounded-[8px] overflow-hidden border-4 border-[#39ff14] shadow-[8px_8px_0px_0px_rgba(57,255,20,0.3)]" style={{ transform: 'rotate(1deg)' }}>
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1694151569569-8288e3118519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3N0ZWwlMjBkb3JtJTIwcm9vbSUyMGNsZWFufGVufDF8fHx8MTc3MzcyNDY3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Clean Rooms"
                  className="w-full aspect-video object-cover"
                />
              </div>
              <div className="order-1 md:order-2">
                <h3 className="font-['Space_Grotesk'] font-bold text-[24px] text-[#39ff14] uppercase mb-4">
                  Safety is Non-Negotiable
                </h3>
                <p className="font-['Space_Grotesk'] text-[16px] text-[rgba(255,255,255,0.9)] leading-[24px]">
                  We believe safety and fun go hand-in-hand. That's why every The Daily Social has 24/7 security, female-only dorms, secure lockers, and zero-tolerance harassment policies. You can let loose knowing we've got your back.
                </p>
              </div>
            </div>

            {/* Z-Pattern 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="font-['Space_Grotesk'] font-bold text-[24px] text-[#00d1ff] uppercase mb-4">
                  Mixed-Gender Co-Living, Done Right
                </h3>
                <p className="font-['Space_Grotesk'] text-[16px] text-[rgba(255,255,255,0.9)] leading-[24px]">
                  We celebrate diversity and inclusion. Our mixed dorms foster genuine connections across cultures, while our female-only spaces provide safe havens. Respect the vibe, and you'll always be welcome here.
                </p>
              </div>
              <div className="rounded-[8px] overflow-hidden border-4 border-[#00d1ff] shadow-[8px_8px_0px_0px_rgba(0,209,255,0.3)]" style={{ transform: 'rotate(-1deg)' }}>
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1641352848574-9dbb6a244a32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjByb29mdG9wJTIwdGVycmFjZSUyMGNpdHl8ZW58MXx8fHwxNzczNzI0Njg0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                  alt="Location"
                  className="w-full aspect-video object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars Grid */}
      <section className="px-6 py-16">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="font-['Space_Grotesk'] font-bold text-[36px] text-white tracking-[-1.8px] uppercase leading-[40px] text-center mb-3">
            What We Stand For
          </h2>
          <p className="font-['Liberation_Serif'] text-[16px] text-[rgba(255,255,255,0.7)] text-center mb-12 italic">
            our four pillars
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-[#1e293b] border-2 border-[#334155] rounded-[12px] p-8 text-center hover:border-white transition-all group"
                style={{ transform: `rotate(${(idx % 2 === 0 ? -1 : 1)}deg)` }}
              >
                <div
                  className="inline-flex p-4 rounded-full mb-6 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${pillar.color}20`, color: pillar.color }}
                >
                  {pillar.icon}
                </div>
                <h3 className="font-['Space_Grotesk'] font-bold text-[20px] text-white uppercase mb-3">
                  {pillar.title}
                </h3>
                <p className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.8)] leading-[20px]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="px-6 py-16 bg-gradient-to-br from-[#c62828] via-[#8e1b1b] to-[#c62828]">
        <div className="max-w-screen-md mx-auto text-center">
          <h2 className="font-['Space_Grotesk'] font-bold text-[48px] md:text-[60px] text-white tracking-[-2.5px] uppercase leading-[48px] md:leading-[58px] mb-6">
            Ready to Find<br />Your Vibe?
          </h2>
          
          <p className="font-['Liberation_Serif'] text-[18px] text-white italic mb-10 leading-[28px]">
            Join thousands of travelers who've made The Daily Social their home away from home.
          </p>

          <Link
            to="/rooms"
            className="inline-flex items-center gap-3 bg-white px-12 py-5 rounded-[4px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.4)] transition-all"
          >
            <span className="font-['Space_Grotesk'] font-bold text-[20px] text-[#c62828] uppercase">
              Search Availability
            </span>
            <ArrowRight className="w-6 h-6 text-[#c62828]" />
          </Link>

          <div className="mt-8 flex items-center justify-center gap-8 flex-wrap">
            <div className="text-center">
              <p className="font-['Space_Grotesk'] font-bold text-[32px] text-white">50K+</p>
              <p className="font-['Space_Grotesk'] text-[14px] text-white opacity-90">Guests Hosted</p>
            </div>
            <div className="text-center">
              <p className="font-['Space_Grotesk'] font-bold text-[32px] text-white">4.8★</p>
              <p className="font-['Space_Grotesk'] text-[14px] text-white opacity-90">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="font-['Space_Grotesk'] font-bold text-[32px] text-white">8+</p>
              <p className="font-['Space_Grotesk'] text-[14px] text-white opacity-90">Cities in India</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t-2 border-[#1e293b] px-6 py-12">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link to="/" className="font-['Space_Grotesk'] font-bold text-[24px] text-[#c62828] uppercase tracking-[2px] mb-4 inline-block">
                The Daily Social
              </Link>
              <p className="font-['Liberation_Serif'] text-[14px] text-[rgba(255,255,255,0.6)] italic mb-4">
                Stay. Mix. Repeat.
              </p>
              <div className="flex gap-4">
                <a href="#" className="text-[rgba(255,255,255,0.6)] hover:text-[#c62828] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-['Space_Grotesk'] font-bold text-[14px] text-white uppercase tracking-[1px] mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2">
                <li><Link to="/" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/rooms" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Rooms</Link></li>
                <li><Link to="/events" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Events</Link></li>
                <li><Link to="/about" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">About</Link></li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-['Space_Grotesk'] font-bold text-[14px] text-white uppercase tracking-[1px] mb-4">
                Policies
              </h4>
              <ul className="space-y-2">
                <li><Link to="/policies/guest" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Guest Policies</Link></li>
                <li><Link to="/policies/privacy" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/policies/refund" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Refund Policy</Link></li>
                <li><Link to="/policies/terms" className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)] hover:text-white transition-colors">Terms & Conditions</Link></li>
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
