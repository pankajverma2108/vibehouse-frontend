import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Calendar, MapPin, Clock, Users, Instagram, Music, Beer, Gamepad2, Film, Mic } from 'lucide-react';
import { Link } from 'react-router';

export default function EventsPage() {
  const upcomingEvents = [
    {
      title: 'Neon DJ Night',
      date: 'Mar 18, 2026',
      time: '9:00 PM',
      location: 'Rooftop Terrace',
      price: 'Free for Guests',
      image: 'https://images.unsplash.com/photo-1758179764880-7513421d202a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuaWdodGNsdWIlMjBuZW9uJTIwbGlnaHRzJTIwcGFydHl8ZW58MXx8fHwxNzczNzI5NTI1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      badge: 'Tonight',
      badgeColor: '#c62828',
      capacity: '50 guests'
    },
    {
      title: 'Old City Pub Crawl',
      date: 'Mar 19, 2026',
      time: '8:30 PM',
      location: 'Meet at Lobby',
      price: '₹599',
      image: 'https://images.unsplash.com/photo-1763651961183-19eb504dee15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwdWIlMjBjcmF3bCUyMGZyaWVuZHMlMjBuaWdodCUyMG91dHxlbnwxfHx8fDE3NzM3Mjk1MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      badge: 'Popular',
      badgeColor: '#facc15',
      capacity: '30 guests'
    },
    {
      title: 'Live Local Music',
      date: 'Mar 20, 2026',
      time: '7:00 PM',
      location: 'Common Area',
      price: 'Free for Guests',
      image: 'https://images.unsplash.com/photo-1647649644192-af6183269fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBwYXJ0eSUyMG5pZ2h0bGlmZXxlbnwxfHx8fDE3NzM3MjQ2NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      badge: 'Live',
      badgeColor: '#00d1ff',
      capacity: '40 guests'
    },
  ];

  const weeklyLineup = [
    { day: 'Monday', event: 'Movie Night', time: '8:00 PM', icon: <Film className="w-6 h-6" />, color: '#c62828' },
    { day: 'Tuesday', event: 'Beer Pong Tournament', time: '9:00 PM', icon: <Beer className="w-6 h-6" />, color: '#facc15' },
    { day: 'Wednesday', event: 'Game Night', time: '7:30 PM', icon: <Gamepad2 className="w-6 h-6" />, color: '#39ff14' },
    { day: 'Thursday', event: 'Pub Crawl', time: '8:30 PM', icon: <Beer className="w-6 h-6" />, color: '#00d1ff' },
    { day: 'Friday', event: 'DJ Night', time: '9:00 PM', icon: <Music className="w-6 h-6" />, color: '#c62828' },
    { day: 'Saturday', event: 'Open Mic', time: '8:00 PM', icon: <Mic className="w-6 h-6" />, color: '#39ff14' },
    { day: 'Sunday', event: 'Chill Sunday', time: '6:00 PM', icon: <Users className="w-6 h-6" />, color: '#facc15' },
  ];

  const pastEvents = [
    'https://images.unsplash.com/photo-1681747971522-2d7a04c78321?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWNrcGFja2VycyUyMGxhdWdoaW5nJTIwdG9nZXRoZXIlMjBob3N0ZWx8ZW58MXx8fHwxNzczNzI0Njc0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    'https://images.unsplash.com/photo-1710144994421-a41e387e71c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHRyYXZlbGVycyUyMGdhbWUlMjBuaWdodHxlbnwxfHx8fDE3NzM3MjQ2NzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    'https://images.unsplash.com/photo-1766113491996-19167a988455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwdG9hc3RpbmclMjBkcmlua3MlMjBjZWxlYnJhdGlvbnxlbnwxfHx8fDE3NzM3MjQ2ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    'https://images.unsplash.com/photo-1647649644192-af6183269fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBwYXJ0eSUyMG5pZ2h0bGlmZXxlbnwxfHx8fDE3NzM3MjQ2NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    'https://images.unsplash.com/photo-1622646771382-1c9c090d3c37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHRyYXZlbGVyJTIwcG9ydHJhaXQlMjB5b3VuZ3xlbnwxfHx8fDE3NzM3MjQ2Nzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    'https://images.unsplash.com/photo-1641352848574-9dbb6a244a32?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjByb29mdG9wJTIwdGVycmFjZSUyMGNpdHl8ZW58MXx8fHwxNzczNzI0Njg0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  ];

  return (
    <div className="bg-[#0f172a] min-h-screen">
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
              <Link to="/events" className="font-['Space_Grotesk'] text-[14px] text-[#c62828]">
                Events
              </Link>
              <Link to="/about" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                About
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(15,23,42,0.7)] to-[#0f172a] z-10" />
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1758179764880-7513421d202a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuaWdodGNsdWIlMjBuZW9uJTIwbGlnaHRzJTIwcGFydHl8ZW58MXx8fHwxNzczNzI5NTI1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Events Hero"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-20 text-center px-6 py-16">
          <div className="bg-gradient-to-r from-[#c62828] to-[#8e1b1b] px-4 py-2 inline-block shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.3)] mb-8 rounded-[4px]" style={{ transform: 'rotate(-2deg)' }}>
            <p className="font-['Space_Grotesk'] font-bold text-[14px] text-white text-center tracking-[1.4px] uppercase">
              Every Night is an Adventure
            </p>
          </div>
          
          <h1 className="font-['Space_Grotesk'] font-bold text-[56px] md:text-[80px] text-white tracking-[-3px] uppercase leading-[54px] md:leading-[76px] mb-6">
            Never a<br />Dull Evening.
          </h1>
          
          <p className="font-['Liberation_Serif'] text-[18px] md:text-[20px] text-[rgba(255,255,255,0.9)] italic max-w-[700px] mx-auto">
            From pub crawls to game nights, meet travelers from around the world and create memories that last forever.
          </p>
        </div>
      </section>

      {/* Upcoming Events Calendar */}
      <section className="px-6 py-16">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-['Space_Grotesk'] font-bold text-[36px] text-white tracking-[-1.8px] uppercase leading-[40px] mb-2">
                This Week
              </h2>
              <p className="font-['Liberation_Serif'] text-[16px] text-[rgba(255,255,255,0.7)] italic">
                happening next 7 days
              </p>
            </div>
            <div className="bg-[#1e293b] border-2 border-[#c62828] rounded-[12px] px-4 py-2">
              <p className="font-['Space_Grotesk'] font-bold text-[12px] text-[#c62828] uppercase tracking-[1px]">
                🔥 {upcomingEvents.length} Events
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingEvents.map((event, idx) => (
              <div
                key={idx}
                className="bg-[#1e293b] border-2 border-[#334155] rounded-[12px] overflow-hidden shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.2)] hover:border-[#c62828] transition-all duration-300 hover:shadow-[0px_25px_30px_-5px_rgba(198,40,40,0.4)] group"
                style={{ transform: `rotate(${(idx % 2 === 0 ? -1 : 1)}deg)` }}
              >
                {/* Event Image */}
                <div className="relative h-[220px] overflow-hidden">
                  <ImageWithFallback
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.8)] to-transparent" />
                  
                  {event.badge && (
                    <div
                      className="absolute top-4 right-4 z-10 px-4 py-2 rounded-[12px] border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                      style={{ backgroundColor: event.badgeColor, transform: 'rotate(8deg)' }}
                    >
                      <span className="font-['Space_Grotesk'] font-bold text-[12px] text-white uppercase">
                        {event.badge}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-['Space_Grotesk'] font-bold text-[24px] text-white uppercase leading-[28px]">
                      {event.title}
                    </h3>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-[rgba(198,40,40,0.2)] p-2 rounded-[4px]">
                        <Calendar className="w-4 h-4 text-[#c62828]" />
                      </div>
                      <span className="font-['Space_Grotesk'] text-[14px] text-white">
                        {event.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-[rgba(0,209,255,0.2)] p-2 rounded-[4px]">
                        <Clock className="w-4 h-4 text-[#00d1ff]" />
                      </div>
                      <span className="font-['Space_Grotesk'] text-[14px] text-white">
                        {event.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-[rgba(57,255,20,0.2)] p-2 rounded-[4px]">
                        <MapPin className="w-4 h-4 text-[#39ff14]" />
                      </div>
                      <span className="font-['Space_Grotesk'] text-[14px] text-white">
                        {event.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-[rgba(250,204,21,0.2)] p-2 rounded-[4px]">
                        <Users className="w-4 h-4 text-[#facc15]" />
                      </div>
                      <span className="font-['Space_Grotesk'] text-[14px] text-white">
                        {event.capacity}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[rgba(198,40,40,0.1)] border-2 border-dashed border-[#c62828] rounded-[4px] p-3 mb-6 text-center">
                    <span className="font-['Space_Grotesk'] font-bold text-[18px] text-[#c62828]">
                      {event.price}
                    </span>
                  </div>

                  <button className="w-full bg-[#c62828] px-8 py-3 rounded-[4px] shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] transition-all">
                    <span className="font-['Space_Grotesk'] font-bold text-[16px] text-white uppercase">
                      RSVP / Book
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly Lineup */}
      <section className="px-6 py-16 bg-[rgba(255,255,255,0.02)]">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="font-['Space_Grotesk'] font-bold text-[36px] text-white tracking-[-1.8px] uppercase leading-[40px] text-center mb-3">
            Standard Weekly Lineup
          </h2>
          <p className="font-['Liberation_Serif'] text-[16px] text-[rgba(255,255,255,0.7)] text-center mb-12 italic">
            your weekly dose of good vibes
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {weeklyLineup.map((item, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-[#334155] rounded-[8px] p-6 hover:border-white transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ color: item.color }}>
                    {item.icon}
                  </div>
                  <span className="font-['Space_Grotesk'] font-bold text-[14px] uppercase tracking-[1px]" style={{ color: item.color }}>
                    {item.day}
                  </span>
                </div>
                <h3 className="font-['Space_Grotesk'] font-bold text-[18px] text-white mb-2">
                  {item.event}
                </h3>
                <p className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)]">
                  {item.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Past Events Gallery */}
      <section className="px-6 py-16">
        <div className="max-w-screen-xl mx-auto">
          <h2 className="font-['Space_Grotesk'] font-bold text-[36px] text-white tracking-[-1.8px] uppercase leading-[40px] text-center mb-3">
            The Memories
          </h2>
          <p className="font-['Liberation_Serif'] text-[16px] text-[rgba(255,255,255,0.7)] text-center mb-12 italic">
            last month's highlights
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            {pastEvents.map((img, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-[8px] overflow-hidden border-4 border-white shadow-[8px_8px_0px_0px_rgba(198,40,40,0.5)] hover:shadow-[12px_12px_0px_0px_rgba(198,40,40,0.7)] transition-all cursor-pointer"
                style={{ transform: `rotate(${(idx % 3 - 1) * 2}deg)` }}
              >
                <ImageWithFallback
                  src={img}
                  alt={`Event ${idx + 1}`}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button className="bg-gradient-to-r from-[#c62828] via-[#8e1b1b] to-[#c62828] px-10 py-5 rounded-[12px] border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.3)] hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.4)] transition-all flex items-center gap-4" style={{ transform: 'rotate(-2deg)' }}>
              <Instagram className="w-7 h-7 text-white" />
              <div className="text-left">
                <p className="font-['Space_Grotesk'] font-bold text-[10px] text-white uppercase tracking-[1px] opacity-80">
                  Follow our Vibe on
                </p>
                <p className="font-['Space_Grotesk'] font-bold text-[20px] text-white uppercase tracking-[1px]">
                  Instagram
                </p>
              </div>
            </button>
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
