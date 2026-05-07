import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Wifi, Lock, Snowflake, Droplet, CheckCircle2, Users, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import Navigation from '../components/Navigation';

export default function RoomsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const roomCategories = [
    {
      title: '4-Bed Mixed Dorm',
      price: '₹599',
      features: ['Reading lights', 'Privacy curtains', 'USB charging ports', 'Individual lockers'],
      image: 'https://images.unsplash.com/photo-1758632031161-b6d7e913c2b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBidW5rJTIwYmVkcyUyMGludGVyaW9yJTIwY2xlYW58ZW58MXx8fHwxNzczNzI5NTIzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      badge: 'Most Popular',
      badgeColor: '#c62828'
    },
    {
      title: '4-Bed Female Dorm',
      price: '₹599',
      features: ['Women-only space', 'En-suite bathroom', 'Reading lights', 'Privacy curtains'],
      image: 'https://images.unsplash.com/photo-1626265774643-f1943311a86b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMG9ubHklMjBob3N0ZWwlMjBkb3JtJTIwc2FmZXxlbnwxfHx8fDE3NzM3Mjk1MjN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      badge: 'Safe Space',
      badgeColor: '#39ff14'
    },
    {
      title: 'Private Room',
      price: '₹1,299',
      features: ['Queen-size bed', 'En-suite bathroom', 'Work desk', 'Mini-fridge'],
      image: 'https://images.unsplash.com/photo-1721522281545-fad32dd5107a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBwcml2YXRlJTIwYmVkcm9vbSUyMG1vZGVybnxlbnwxfHx8fDE3NzM3Mjk1MjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      badge: 'Premium',
      badgeColor: '#00d1ff'
    },
  ];

  const faqs = [
    { q: 'What time is check-in?', a: 'Check-in is from 2:00 PM onwards. Early check-in may be available upon request subject to availability.' },
    { q: 'Do I need to bring a padlock?', a: 'No need! We provide secure lockers with built-in locks. You can also purchase a padlock at reception if needed.' },
    { q: 'Are towels and linens provided?', a: 'Yes! Fresh linen and towels are provided for all guests. We also have daily housekeeping.' },
    { q: 'Is breakfast included?', a: 'Breakfast is not included in the room rate, but our café offers delicious breakfast options at affordable prices.' },
  ];

  return (
    <div className="bg-[#230f14] min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(35,15,20,0.8)] to-[#230f14] z-10" />
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1694151569569-8288e3118519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3N0ZWwlMjBkb3JtJTIwcm9vbSUyMGNsZWFufGVufDF8fHx8MTc3MzcyNDY3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Rooms Hero"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-20 text-center px-6 py-16">
          <div className="bg-[#c62828] px-3 py-1 inline-block shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] mb-6">
            <p className="font-['Space_Grotesk'] font-bold text-[12px] text-white text-center tracking-[1.2px] uppercase leading-[16px]">
              Choose Your Vibe
            </p>
          </div>
          
          <h1 className="font-['Space_Grotesk'] font-bold text-[48px] md:text-[72px] text-white tracking-[-2.4px] uppercase leading-[48px] md:leading-[68px] mb-4">
            Find Your Vibe.<br />Book Your Bed.
          </h1>
          
          <p className="font-['Liberation_Serif'] text-[16px] md:text-[18px] text-[rgba(255,255,255,0.8)] italic max-w-[600px] mx-auto">
            From social dorms to private retreats, we've got the perfect space for every traveler.
          </p>
        </div>
      </section>

      {/* Room Categories Grid */}
      <section className="px-6 py-16 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {roomCategories.map((room, idx) => (
            <div
              key={idx}
              className="bg-[#1e293b] border-2 border-[#334155] rounded-[8px] overflow-hidden shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] hover:border-[#c62828] transition-all duration-300 hover:shadow-[0px_25px_30px_-5px_rgba(198,40,40,0.3)]"
              style={{ transform: `rotate(${(idx % 2 === 0 ? -0.5 : 0.5)}deg)` }}
            >
              {/* Image Carousel */}
              <div className="relative h-[280px] overflow-hidden">
                <ImageWithFallback
                  src={room.image}
                  alt={room.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                {room.badge && (
                  <div
                    className="absolute top-4 left-4 z-10 px-4 py-2 rounded-[2px] border-2 border-[#0f172a] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                    style={{ backgroundColor: room.badgeColor, transform: 'rotate(-2deg)' }}
                  >
                    <span className="font-['Space_Grotesk'] font-bold text-[12px] text-white uppercase">
                      {room.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-6">
                <h3 className="font-['Space_Grotesk'] font-bold text-[24px] text-white uppercase leading-[30px] mb-4">
                  {room.title}
                </h3>

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {room.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#39ff14] mt-0.5 flex-shrink-0" />
                      <span className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.8)]">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Block */}
                <div className="bg-[rgba(198,40,40,0.1)] border-2 border-dashed border-[#c62828] rounded-[4px] p-4 mb-6">
                  <p className="font-['Space_Grotesk'] text-[12px] text-[rgba(255,255,255,0.6)] uppercase tracking-[1px] mb-1">
                    Starting from
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-['Space_Grotesk'] font-bold text-[32px] text-[#c62828]">
                      {room.price}
                    </span>
                    <span className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)]">
                      / night
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <button className="w-full bg-[#c62828] px-10 py-4 rounded-[2px] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] transition-all group">
                  <span className="font-['Space_Grotesk'] font-bold text-[18px] text-white uppercase leading-[28px] flex items-center justify-center gap-2">
                    Check Dates
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Included Assurances */}
      <section className="px-6 py-16 bg-[rgba(255,255,255,0.05)]">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="font-['Space_Grotesk'] font-bold text-[30px] text-white tracking-[-1.5px] uppercase leading-[36px] text-center mb-3">
            Included with Every Stay
          </h2>
          <p className="font-['Liberation_Serif'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-12 italic">
            no hidden fees, just good vibes
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Wifi className="w-8 h-8" />, label: 'Free Fast Wi-Fi', color: '#00d1ff' },
              { icon: <Snowflake className="w-8 h-8" />, label: 'AC in All Rooms', color: '#39ff14' },
              { icon: <Lock className="w-8 h-8" />, label: 'Secure Lockers', color: '#c62828' },
              { icon: <Droplet className="w-8 h-8" />, label: 'Fresh Linen Daily', color: '#facc15' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-[#1e293b] border-2 border-dashed border-[rgba(255,255,255,0.2)] rounded-[8px] p-6 text-center hover:border-solid hover:border-white transition-all"
              >
                <div className="flex justify-center mb-3" style={{ color: item.color }}>
                  {item.icon}
                </div>
                <p className="font-['Space_Grotesk'] font-bold text-[14px] text-white uppercase leading-[20px]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* House Rules */}
      <section className="px-6 py-16 max-w-screen-md mx-auto">
        <h2 className="font-['Space_Grotesk'] font-bold text-[30px] text-white tracking-[-1.5px] uppercase leading-[36px] text-center mb-3">
          House Rules
        </h2>
        <p className="font-['Liberation_Serif'] text-[14px] text-[rgba(255,255,255,0.8)] text-center mb-10 italic">
          keeping the vibe alive for everyone
        </p>

        <div className="bg-[#1e293b] border-2 border-[#334155] rounded-[8px] p-8">
          <div className="space-y-4">
            {[
              { rule: 'Quiet Hours (11 PM - 7 AM in dorms)', icon: '🤫' },
              { rule: 'Locker Usage Required for valuables', icon: '🔒' },
              { rule: 'Respect the Vibe (Zero-tolerance anti-harassment policy)', icon: '✨' },
              { rule: 'No outside guests in dorms without staff permission', icon: '🚫' },
              { rule: 'Keep common areas clean and tidy', icon: '🧹' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <span className="text-[24px] flex-shrink-0">{item.icon}</span>
                <p className="font-['Space_Grotesk'] text-[16px] text-white leading-[24px]">
                  {item.rule}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ & Contact */}
      <section className="px-6 py-16 bg-[rgba(255,255,255,0.05)]">
        <div className="max-w-screen-lg mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* FAQ */}
            <div>
              <h2 className="font-['Space_Grotesk'] font-bold text-[24px] text-white uppercase mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1e293b] border-2 border-[#334155] rounded-[4px] overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-[rgba(198,40,40,0.1)] transition-colors"
                    >
                      <span className="font-['Space_Grotesk'] font-bold text-[14px] text-white text-left">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-[#c62828] transition-transform ${
                          openFaq === idx ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openFaq === idx && (
                      <div className="px-5 py-4 border-t-2 border-[#334155]">
                        <p className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.8)] leading-[20px]">
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="font-['Space_Grotesk'] font-bold text-[24px] text-white uppercase mb-6">
                Get in Touch
              </h2>
              <div className="bg-[#1e293b] border-2 border-[#334155] rounded-[8px] p-6 space-y-6">
                <div>
                  <p className="font-['Space_Grotesk'] font-bold text-[12px] text-[rgba(255,255,255,0.6)] uppercase tracking-[1px] mb-2">
                    WhatsApp / Phone
                  </p>
                  <a
                    href="tel:+918884973328"
                    className="font-['Space_Grotesk'] text-[18px] text-[#00d1ff] hover:text-[#c62828] transition-colors"
                  >
                    +91 88849 73328
                  </a>
                </div>

                <div>
                  <p className="font-['Space_Grotesk'] font-bold text-[12px] text-[rgba(255,255,255,0.6)] uppercase tracking-[1px] mb-2">
                    Email
                  </p>
                  <a
                    href="mailto:thedailysocial01@gmail.com"
                    className="font-['Space_Grotesk'] text-[18px] text-[#00d1ff] hover:text-[#c62828] transition-colors"
                  >
                    thedailysocial01@gmail.com
                  </a>
                </div>

                <div>
                  <p className="font-['Space_Grotesk'] font-bold text-[12px] text-[rgba(255,255,255,0.6)] uppercase tracking-[1px] mb-2">
                    Address
                  </p>
                  <p className="font-['Space_Grotesk'] text-[16px] text-white leading-[22px]">
                    123 Backpacker Street<br />
                    Old Town, City Center<br />
                    Mumbai 400001
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-[#334155]">
                  <div className="bg-[rgba(198,40,40,0.1)] border-2 border-dashed border-[#c62828] rounded-[4px] p-4">
                    <p className="font-['Space_Grotesk'] text-[12px] text-white text-center">
                      📍 <span className="font-bold">5 mins walk</span> from Metro Station
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t-2 border-[#1e293b] px-6 py-8">
        <div className="max-w-screen-xl mx-auto text-center">
          <Link to="/" className="font-['Space_Grotesk'] font-bold text-[20px] text-[#c62828] uppercase tracking-[2px]">
            The Daily Social
          </Link>
          <p className="font-['Space_Grotesk'] text-[12px] text-[rgba(255,255,255,0.4)] mt-4">
            © 2026 The Daily Social. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}