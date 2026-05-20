import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Check, Coffee, Wifi, 
  Wind, Shield, WashingMachine, MapPin, Star,
  ChevronRight, ArrowRight, CheckCircle2, ShieldCheck,
  CreditCard, Loader2
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

// MOCK BACKEND
const API = {
  fetchRooms: async () => {
    return new Promise<any[]>((resolve) => {
      setTimeout(() => {
        resolve([
          { 
            id: 'room_dorm_4m', 
            name: '4 Bed Mixed Dormitory', 
            type: 'Dormitory', 
            amenities: ['Premium Bunk Bed', 'Shared Bathroom', 'Air Conditioning', 'Personal Locker', 'Reading Light'], 
            isReady: true, 
            image: 'https://images.unsplash.com/photo-1588939349575-7ab15c8bd1ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidW5rJTIwYmVkJTIwbW9kZXJufGVufDF8fHx8MTc3NzQ2NjQ5M3ww&ixlib=rb-4.1.0&q=80&w=1080' 
          },
          { 
            id: 'room_deluxe', 
            name: 'Deluxe Private', 
            type: 'Private Room', 
            amenities: ['Queen Bed', 'En-suite Bathroom', 'Air Conditioning', 'Work Desk', 'Mini Fridge'], 
            isReady: true, 
            image: 'https://images.unsplash.com/photo-1765775635143-6462630748ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3RlbCUyMHJvb218ZW58MXx8fHwxNzc3MzY4NDY0fDA&ixlib=rb-4.1.0&q=80&w=1080' 
          },
          { id: 'room_dorm_4f', name: '4 Bed Female Dormitory', isReady: false },
          { id: 'room_dorm_6m', name: '6 Bed Mixed Dormitory', isReady: false }
        ]);
      }, 800);
    });
  },
  fetchQuote: async (roomId: string, months: number, addOns: any) => {
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        const baseRates: Record<string, number> = {
          'room_dorm_4m': 11500,
          'room_deluxe': 32000
        };
        const monthlyBase = baseRates[roomId] || 0;
        
        const mealsCost = addOns.meals ? 4500 * months : 0;
        const laundryCost = addOns.laundry ? 1200 * months : 0;
        
        const subtotal = (monthlyBase * months) + mealsCost + laundryCost;
        const taxes = Math.round(subtotal * 0.12); // 12% GST
        
        resolve({
          baseRate: monthlyBase,
          subtotal,
          taxes,
          total: subtotal + taxes,
          breakdown: { meals: mealsCost, laundry: laundryCost }
        });
      }, 1200);
    });
  }
};

export default function ColiveFlow() {
  // Global State
  const [step, setStep] = useState<'BROWSING' | 'CONFIRMED'>('BROWSING');
  
  // Property Data
  const property = {
    name: 'The Daily Social - Koramangala A',
    id: '60765',
    location: 'Koramangala, Bengaluru',
    images: [
      'https://images.unsplash.com/photo-1775212131982-403656f5cced?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob3N0ZWwlMjBleHRlcmlvcnxlbnwxfHx8fDE3Nzc0NjY0ODh8MA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1565629196891-2ddb37c9e9fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBsb3VuZ2V8ZW58MXx8fHwxNzc3NDY2NDkzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3dvcmtpbmclMjBzcGFjZXxlbnwxfHx8fDE3Nzc0NjY0ODh8MA&ixlib=rb-4.1.0&q=80&w=1080'
    ]
  };

  // Selection State
  const [months, setMonths] = useState(1);
  const [moveInDate, setMoveInDate] = useState('2026-06-01');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  
  // Add-ons
  const [addOns, setAddOns] = useState({ meals: false, laundry: false });
  
  // Backend State
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [loadingQuotes, setLoadingQuotes] = useState<Record<string, boolean>>({});

  // Fetch Rooms
  useEffect(() => {
    API.fetchRooms().then(data => {
      const readyRooms = data.filter(r => r.isReady);
      setRooms(readyRooms);
      setLoadingRooms(false);
    });
  }, []);

  // Fetch Quotes whenever months or add-ons change
  useEffect(() => {
    if (rooms.length === 0) return;
    
    rooms.forEach(room => {
      setLoadingQuotes(prev => ({ ...prev, [room.id]: true }));
      API.fetchQuote(room.id, months, addOns).then(quote => {
        setQuotes(prev => ({ ...prev, [room.id]: quote }));
        setLoadingQuotes(prev => ({ ...prev, [room.id]: false }));
      });
    });
  }, [rooms, months, addOns]);

  const activeQuote = selectedRoom ? quotes[selectedRoom] : null;
  const isActiveQuoteLoading = selectedRoom ? loadingQuotes[selectedRoom] : false;

  const handleConfirm = () => {
    if (!selectedRoom || isActiveQuoteLoading) return;
    setStep('CONFIRMED');
  };

  if (step === 'CONFIRMED') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-['Geologica'] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111] border border-[#222] rounded-2xl p-8 text-center shadow-2xl shadow-black/50">
           <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <CheckCircle2 className="w-10 h-10 text-green-500" />
           </div>
           <h1 className="font-['Suez_One'] text-3xl mb-2 text-[#E53935]">Booking Confirmed!</h1>
           <p className="text-gray-400 mb-8">You're all set for {months} {months > 1 ? 'months' : 'month'} at The Daily Social.</p>
           
           <div className="bg-[#1a1a1a] rounded-xl p-5 mb-8 text-left border border-[#222]">
             <p className="text-sm text-gray-500 mb-1">Booking Reference</p>
             <p className="font-bold font-mono tracking-wider text-lg mb-4">TDS-COLIVE-8821</p>
             
             <p className="text-sm text-gray-500 mb-1">Move-in Date</p>
             <p className="font-medium mb-4">{new Date(moveInDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
             
             <div className="pt-4 border-t border-[#333] flex items-center gap-3">
               <ShieldCheck className="w-5 h-5 text-[#FFC107]" />
               <span className="text-sm text-gray-300">Your monthly rate is locked in.</span>
             </div>
           </div>

           <button onClick={() => window.location.reload()} className="w-full bg-[#222] hover:bg-[#333] text-white py-4 rounded-xl font-medium transition-colors">
             View Dashboard
           </button>
           <p className="text-xs text-gray-500 mt-4">We've sent onboarding details to your WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Geologica'] selection:bg-[#E53935] selection:text-white">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#222]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="font-['Suez_One'] text-xl text-white tracking-wide">
             The Daily <span className="text-[#E53935]">Social.</span>
           </div>
           <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
             <a href="#" className="hover:text-white transition-colors">Locations</a>
             <a href="#" className="hover:text-white transition-colors">Colive</a>
             <a href="#" className="hover:text-white transition-colors">Community</a>
           </div>
           <button className="bg-[#111] border border-[#333] px-5 py-2 rounded-full text-sm font-medium hover:bg-[#222] transition-colors">
             Sign In
           </button>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative pt-16 min-h-[70vh] flex flex-col justify-end pb-24">
        <div className="absolute inset-0 z-0">
          <ImageWithFallback 
            src={property.images[0]}
            alt="Hero"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
           <div className="flex items-center gap-2 text-[#FFC107] mb-4 font-medium text-sm bg-black/30 w-max px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
             <Star className="w-4 h-4 fill-current" /> Colive Verified Property
           </div>
           <h1 className="font-['Suez_One'] text-5xl md:text-7xl text-white mb-4 leading-tight">
             Stay Longer. <br/>Live Better.
           </h1>
           <p className="text-xl text-gray-300 max-w-2xl font-light mb-8 flex items-center gap-2">
             <MapPin className="w-5 h-5 text-[#E53935]"/> {property.name}
           </p>

           {/* Search / Config Card */}
           <div className="bg-[#111]/80 backdrop-blur-xl border border-[#333] p-4 rounded-2xl inline-flex flex-col md:flex-row gap-4 items-end shadow-2xl shadow-black/50">
              <div className="w-full md:w-auto">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5 font-medium ml-1">Move-in Date</label>
                <div className="relative">
                  <Calendar className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
                  <input 
                    type="date" 
                    value={moveInDate}
                    onChange={e => setMoveInDate(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#333] rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[#E53935] w-full md:w-48 [color-scheme:dark]" 
                  />
                </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5 font-medium ml-1">Duration</label>
                <div className="relative">
                  <Clock className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
                  <select 
                    value={months}
                    onChange={e => setMonths(Number(e.target.value))}
                    className="bg-[#1a1a1a] border border-[#333] rounded-xl pl-11 pr-10 py-3 text-white focus:outline-none focus:border-[#E53935] w-full md:w-48 appearance-none">
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                  </select>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1.5 font-medium ml-1">Guests</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-3.5 text-gray-500" />
                  <select className="bg-[#1a1a1a] border border-[#333] rounded-xl pl-11 pr-10 py-3 text-white focus:outline-none focus:border-[#E53935] w-full md:w-48 appearance-none">
                    <option>1 Solo Worker</option>
                    <option>2 (Couple/Friends)</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={() => {
                  const el = document.getElementById('rooms');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full md:w-auto bg-[#E53935] hover:bg-[#D32F2F] text-white px-8 py-3.5 rounded-xl font-medium transition-colors shadow-lg shadow-red-900/20">
                Update Quote
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12 relative">
        
        {/* Left Column: Content */}
        <div className="flex-1 space-y-16 pb-32 lg:pb-0">
          
          {/* Gallery */}
          <section>
            <h2 className="font-['Suez_One'] text-3xl mb-6">The Property</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="md:col-span-2 h-64 md:h-80 bg-gray-800 rounded-2xl overflow-hidden border border-[#222]">
                 <ImageWithFallback src={property.images[1]} alt="Common area" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
               </div>
               <div className="h-64 md:h-80 bg-gray-800 rounded-2xl overflow-hidden border border-[#222]">
                 <ImageWithFallback src={property.images[2]} alt="Coworking space" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
               </div>
            </div>
            <p className="mt-6 text-gray-400 leading-relaxed font-light text-lg">
              Located in the heart of Bengaluru's vibrant tech hub, Koramangala A is designed for digital nomads, slow travelers, and remote workers who want premium comfort combined with a thriving community. Zero deposits, zero hassle.
            </p>
          </section>

          {/* Inclusions */}
          <section>
             <h2 className="font-['Suez_One'] text-3xl mb-6">Monthly Inclusions</h2>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: Wifi, title: 'Gigabit WiFi', desc: 'Enterprise-grade speed' },
                  { icon: Coffee, title: 'Co-work Space', desc: 'Dedicated quiet zones' },
                  { icon: Wind, title: 'Daily Cleaning', desc: 'Housekeeping included' },
                  { icon: Shield, title: 'Zero Deposit', desc: 'No lock-in contracts' },
                  { icon: WashingMachine, title: 'Laundry Room', desc: 'Self-service washers' },
                  { icon: Check, title: 'Utilities', desc: 'Power & water covered' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#111] border border-[#222] p-5 rounded-2xl hover:border-[#444] transition-colors">
                    <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-4">
                       <item.icon className="w-5 h-5 text-[#FFC107]" />
                    </div>
                    <h3 className="font-medium text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                ))}
             </div>
          </section>

          {/* Room Options */}
          <section id="rooms">
             <h2 className="font-['Suez_One'] text-3xl mb-2">Select Your Space</h2>
             <p className="text-gray-400 mb-8">Pricing adjusts dynamically based on backend availability.</p>

             {loadingRooms ? (
               <div className="py-20 flex flex-col items-center justify-center border border-[#222] rounded-2xl bg-[#111]">
                 <Loader2 className="w-8 h-8 animate-spin text-[#E53935] mb-4" />
                 <p className="text-gray-400 font-medium">Fetching ready rooms from backend...</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {rooms.map(room => {
                   const quote = quotes[room.id];
                   const isLoading = loadingQuotes[room.id];
                   const isSelected = selectedRoom === room.id;

                   return (
                     <div 
                       key={room.id}
                       onClick={() => setSelectedRoom(room.id)}
                       className={`group relative flex flex-col md:flex-row bg-[#111] rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${
                         isSelected ? 'border-[#E53935] shadow-[0_0_20px_rgba(229,57,53,0.15)]' : 'border-[#222] hover:border-[#444]'
                       }`}
                     >
                        <div className="w-full md:w-72 h-48 md:h-auto bg-[#1a1a1a]">
                          <ImageWithFallback src={room.image} alt={room.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-['Suez_One'] text-2xl">{room.name}</h3>
                              {isSelected && <div className="bg-[#E53935] text-white text-[10px] font-bold px-2 py-1 uppercase rounded-full tracking-wider">Selected</div>}
                            </div>
                            <p className="text-gray-400 text-sm mb-4">{room.type}</p>
                            <div className="flex flex-wrap gap-2 mb-6">
                              {room.amenities.map((am: string, i: number) => (
                                <span key={i} className="text-xs bg-[#1a1a1a] border border-[#333] px-2.5 py-1 rounded-md text-gray-300">
                                  {am}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-[#222] pt-4 mt-auto">
                            {isLoading || !quote ? (
                              <div className="flex items-center gap-3 text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin text-[#FFC107]" />
                                <span className="text-sm font-medium">Monthly quote pending...</span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Backend Monthly Quote</p>
                                  <p className="text-2xl font-semibold">₹{quote.baseRate.toLocaleString()}<span className="text-sm text-gray-500 font-normal"> / mo</span></p>
                                </div>
                                <button className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${isSelected ? 'bg-[#E53935] text-white' : 'bg-[#1a1a1a] text-white group-hover:bg-[#222]'}`}>
                                  {isSelected ? 'Selected' : 'Select Room'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </section>

          {/* Add-ons */}
          <section className={!selectedRoom ? 'opacity-40 pointer-events-none' : ''}>
             <h2 className="font-['Suez_One'] text-3xl mb-6">Monthly Add-ons</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-colors ${addOns.meals ? 'border-[#E53935] bg-[#111]' : 'border-[#222] bg-[#111] hover:border-[#444]'}`}>
                  <div className="pt-1">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${addOns.meals ? 'bg-[#E53935] border-[#E53935]' : 'border-[#555]'}`}>
                      {addOns.meals && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={addOns.meals} onChange={e => setAddOns(prev => ({...prev, meals: e.target.checked}))} />
                  <div>
                    <h4 className="font-medium mb-1 text-white">Daily Meals</h4>
                    <p className="text-sm text-gray-400">Breakfast & Dinner subscription.</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-colors ${addOns.laundry ? 'border-[#E53935] bg-[#111]' : 'border-[#222] bg-[#111] hover:border-[#444]'}`}>
                  <div className="pt-1">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${addOns.laundry ? 'bg-[#E53935] border-[#E53935]' : 'border-[#555]'}`}>
                      {addOns.laundry && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                  <input type="checkbox" className="hidden" checked={addOns.laundry} onChange={e => setAddOns(prev => ({...prev, laundry: e.target.checked}))} />
                  <div>
                    <h4 className="font-medium mb-1 text-white">Laundry Service</h4>
                    <p className="text-sm text-gray-400">Twice a week washing & folding.</p>
                  </div>
                </label>
             </div>
          </section>

          {/* Guest Details */}
          <section className={!selectedRoom ? 'opacity-40 pointer-events-none' : ''}>
             <h2 className="font-['Suez_One'] text-3xl mb-6">Guest Details</h2>
             <form className="bg-[#111] border border-[#222] p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5">
               <div>
                 <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-medium">First Name</label>
                 <input type="text" className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E53935] transition-colors" placeholder="e.g. John" />
               </div>
               <div>
                 <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-medium">Last Name</label>
                 <input type="text" className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E53935] transition-colors" placeholder="e.g. Doe" />
               </div>
               <div>
                 <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-medium">Email Address</label>
                 <input type="email" className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E53935] transition-colors" placeholder="john@example.com" />
               </div>
               <div>
                 <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block font-medium">Phone Number</label>
                 <input type="tel" className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E53935] transition-colors" placeholder="+91" />
               </div>
             </form>
          </section>
          
        </div>

        {/* Right Column: Sticky Summary */}
        <div className="w-full lg:w-96 shrink-0 z-40 fixed bottom-0 left-0 lg:relative lg:block">
          <div className="bg-[#111] border-t lg:border border-[#222] lg:rounded-2xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:shadow-2xl lg:shadow-black/50 lg:sticky lg:top-24 w-full">
            <div className="hidden lg:block bg-[#1a1a1a] p-5 border-b border-[#222]">
              <h3 className="font-['Suez_One'] text-xl mb-1 text-white">Monthly Summary</h3>
              <p className="text-sm text-gray-400">Review your backend quote</p>
            </div>

            <div className="p-4 lg:p-6 bg-[#111]">
              {!selectedRoom ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#333]">
                    <CreditCard className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-medium">Select a room to generate your quote.</p>
                </div>
              ) : isActiveQuoteLoading || !activeQuote ? (
                <div className="text-center py-10">
                   <Loader2 className="w-8 h-8 animate-spin text-[#E53935] mx-auto mb-4" />
                   <p className="text-gray-400 font-medium">Calculating quote...</p>
                </div>
              ) : (
                <div className="space-y-4 lg:space-y-6">
                  <div className="hidden lg:block">
                    <h4 className="font-medium text-white mb-1">{rooms.find(r => r.id === selectedRoom)?.name}</h4>
                    <p className="text-sm text-gray-400">{months} {months > 1 ? 'Months' : 'Month'} stay</p>
                  </div>

                  <div className="hidden lg:block space-y-3 pt-4 border-t border-[#222] text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span>Room Subtotal</span>
                      <span>₹{(activeQuote.baseRate * months).toLocaleString()}</span>
                    </div>
                    
                    {activeQuote.breakdown.meals > 0 && (
                      <div className="flex justify-between text-gray-300">
                        <span>Meals Add-on</span>
                        <span>₹{activeQuote.breakdown.meals.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {activeQuote.breakdown.laundry > 0 && (
                      <div className="flex justify-between text-gray-300">
                        <span>Laundry Add-on</span>
                        <span>₹{activeQuote.breakdown.laundry.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-gray-500 pt-2">
                      <span>Taxes & Fees (12%)</span>
                      <span>₹{activeQuote.taxes.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 lg:pt-4 lg:border-t border-[#222] flex flex-row lg:flex-col justify-between items-center lg:items-stretch gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1 lg:hidden">Total Payable</p>
                      <div className="flex justify-between items-end mb-1">
                        <span className="hidden lg:inline font-medium text-white">Total Payable</span>
                        <span className="font-['Suez_One'] text-2xl text-white">₹{activeQuote.total.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 text-left lg:text-right">Includes all taxes</p>
                    </div>

                    <button 
                      onClick={handleConfirm}
                      className="flex-1 lg:w-full bg-[#E53935] hover:bg-[#D32F2F] text-white py-3 lg:py-4 px-6 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 transition-colors lg:mt-6">
                      <span className="hidden lg:inline">Pay and Confirm</span>
                      <span className="lg:hidden">Confirm</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="hidden lg:flex items-center gap-2 justify-center text-xs text-gray-500 mt-4">
                    <ShieldCheck className="w-4 h-4" /> Secure SSL checkout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#222] bg-[#0a0a0a] py-12 text-center text-gray-500 text-sm">
        <p>© 2026 The Daily Social. All rights reserved.</p>
      </footer>
      
    </div>
  );
}