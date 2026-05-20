import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { CheckCircle2, Copy, Users, UserPlus, Phone, MapPin, Building, ChevronDown, Check, Info } from "lucide-react";

export function BookingConfirmed() {
  const { id } = useParams();
  const [showDoneModal, setShowDoneModal] = useState(true);
  const [copied, setCopied] = useState(false);

  // If modal is true, we display the modal overlay.
  // In a real app, it could be a separate route, but here it's fine as an overlay.
  if (showDoneModal) {
    return (
      <div className="fixed inset-0 bg-[#111111]/95 z-[200] flex flex-col items-center justify-center p-4 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
        <div className="w-40 h-40 rounded-full bg-green-500/10 flex items-center justify-center mb-8 relative border border-green-500/20 shadow-[0_0_100px_rgba(34,197,94,0.2)]">
          <div className="absolute inset-2 border-2 border-dashed border-green-500/30 rounded-full animate-spin-slow"></div>
          <CheckCircle2 size={64} className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
        </div>
        
        <h2 className="text-3xl font-black text-white mb-2 text-center tracking-tight">
          Web Check-in to <br />
          <span className="text-[#F15824]">Zostel Bangalore (Koramangala)</span>
        </h2>
        <p className="text-xl font-bold text-white mb-10 tracking-widest uppercase">
          Done.
        </p>
        
        <button 
          onClick={() => setShowDoneModal(false)}
          className="bg-white text-black font-black uppercase tracking-wider py-4 px-12 rounded-full hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-xl"
        >
          View Booking
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[60vh] text-white pb-20 pt-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center mb-10">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
          Zo Zo Zo! Your stay at <br className="hidden md:block" />
          <span className="text-[#F15824]">Zostel Bangalore (Koramangala)</span> is confirmed
        </h1>
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-full font-bold text-sm tracking-wide">
          <CheckCircle2 size={16} /> 
          Stay Confirmed
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full blur-[100px] opacity-[0.05] pointer-events-none"></div>
            
            <div className="w-24 h-24 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <CheckCircle2 size={40} className="text-green-400" />
            </div>
            
            <div className="flex flex-col gap-1 text-center md:text-left">
              <h2 className="text-2xl font-black">Your web check-in is complete!</h2>
              <p className="text-gray-400 text-sm">
                You're all set to skip the queue. Check-in directly with your ID at the reception.
              </p>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 md:p-8 shadow-lg">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Users className="text-[#F15824]" />
              Add Co-guests
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Share this link with your co-guests so they can complete their check-in before arrival.
            </p>
            
            <div className="flex flex-col md:flex-row gap-3 mb-8">
              <div className="flex-1 bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-300 font-mono truncate select-all flex items-center overflow-hidden">
                zostel.com/checkin/{id || 'W123456789'}
              </div>
              <button 
                onClick={() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`py-3 px-6 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shrink-0 ${
                  copied ? 'bg-green-500 text-white' : 'bg-[#F15824] hover:bg-[#d84a20] text-white'
                }`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Share Link'}
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-[#212121] border border-green-500/30 rounded-xl relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg">
                    RS
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold">Ritik Singh</span>
                    <span className="text-xs text-green-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} /> Check-in Done
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded">GUEST 1</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#212121] border border-white/5 border-dashed rounded-xl cursor-pointer hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 border-dashed flex items-center justify-center text-gray-500 group-hover:text-white group-hover:bg-[#F15824] transition-colors">
                    <UserPlus size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-400 group-hover:text-white transition-colors">Not Added</span>
                    <span className="text-xs text-[#F15824] font-medium">
                      Pending Check-in
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded">GUEST 2</span>
              </div>
            </div>
          </div>
          
          {/* Information Accordions */}
          <div className="flex flex-col gap-3">
            <button className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-5 rounded-xl hover:bg-[#222222] transition-colors group">
              <div className="flex items-center gap-3 font-bold">
                <Building className="text-gray-400 group-hover:text-[#F15824] transition-colors" /> Room Info
              </div>
              <ChevronDown className="text-gray-500" />
            </button>
            <button className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-5 rounded-xl hover:bg-[#222222] transition-colors group">
              <div className="flex items-center gap-3 font-bold">
                <span className="font-serif italic text-gray-400 group-hover:text-[#F15824] transition-colors px-1">₹</span> Payment Info
              </div>
              <ChevronDown className="text-gray-500" />
            </button>
            <button className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-5 rounded-xl hover:bg-[#222222] transition-colors group">
              <div className="flex items-center gap-3 font-bold">
                <MapPin className="text-gray-400 group-hover:text-[#F15824] transition-colors" /> How to Reach
              </div>
              <ChevronDown className="text-gray-500" />
            </button>
            <button className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-5 rounded-xl hover:bg-[#222222] transition-colors group">
              <div className="flex items-center gap-3 font-bold">
                <Info className="text-gray-400 group-hover:text-[#F15824] transition-colors" /> Cancellation Policy
              </div>
              <ChevronDown className="text-gray-500" />
            </button>
            <button className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 p-5 rounded-xl hover:bg-[#222222] transition-colors group">
              <div className="flex items-center gap-3 font-bold">
                <Building className="text-gray-400 group-hover:text-[#F15824] transition-colors" /> Property Policy
              </div>
              <ChevronDown className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col group relative">
            <div className="absolute top-4 left-4 bg-white text-black text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded shadow-lg z-10 flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer">
              <MapPin size={12} />
              Open Maps
            </div>
            <img 
              src="https://images.unsplash.com/photo-1548345680-f5475ea5df84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb29nbGUlMjBtYXBzJTIwc2NyZWVuc2hvdHxlbnwxfHx8fDE3NzYyMzg4MzV8MA&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="Map" 
              className="w-full h-56 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">Zostel Bangalore (Koramangala)</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                No 42, 60 Feet Road, 6th Block, Koramangala, Bengaluru, Karnataka 560095
              </p>
              <div className="flex gap-4">
                <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#F15824] hover:text-white transition-colors">
                  <Phone size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden shadow-lg group cursor-pointer block">
            <img 
              src="https://images.unsplash.com/photo-1770784794696-475488298fcc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbGx1c3RyYXRlZCUyMG1hcHxlbnwxfHx8fDE3NzYyMzg4MzV8MA&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="Experience Bangalore" 
              className="w-full h-40 object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            />
            <div className="p-5 flex justify-between items-center bg-[#1A1A1A] relative z-10 border-t border-white/5">
              <span className="font-bold">Experience Bangalore</span>
              <ChevronDown className="text-gray-500 -rotate-90 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}