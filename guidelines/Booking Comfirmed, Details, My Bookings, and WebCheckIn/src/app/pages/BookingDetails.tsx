import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Clock, Calendar, CheckCircle2, ChevronRight } from "lucide-react";

export function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[60vh] gap-6 text-white pb-12">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex-1">Checking in to Zostel Bangalore (Koramangala)</h1>
      </div>

      <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden relative border border-white/10">
        <img 
          src="https://images.unsplash.com/photo-1761417327344-66e899ed9a63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc3NjIzNzU3MHww&ixlib=rb-4.1.0&q=80&w=1080" 
          alt="Zostel Bangalore" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/80 to-transparent flex items-end p-6">
          <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full border border-green-500/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <CheckCircle2 size={14} /> Confirmed
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col gap-8">
          <h2 className="text-xl font-bold tracking-tight">Booking Details</h2>
          
          <div className="grid grid-cols-2 gap-x-6 gap-y-8">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Booking ID</span>
              <span className="text-white font-medium">{id || 'W123456789'}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Status</span>
              <span className="text-green-400 font-medium flex items-center gap-1"><CheckCircle2 size={16} /> Confirmed</span>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Check-in</span>
              <span className="text-white font-medium flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" /> Sat, 27 Jul
              </span>
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <Clock size={14} /> 12:00 PM
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Check-out</span>
              <span className="text-white font-medium flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" /> Mon, 29 Jul
              </span>
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <Clock size={14} /> 10:00 AM
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Guests</span>
              <span className="text-white font-medium">2 Guests</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Rooms</span>
              <span className="text-white font-medium">1 Private Room</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#25100B] border border-[#F15824]/30 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_0_20px_rgba(241,88,36,0.1)] relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#F15824] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
            <h3 className="text-lg font-bold text-white z-10">Web Check-in Pending</h3>
            <p className="text-sm text-gray-300 z-10 leading-relaxed">
              Smart explorers check-in early & chill! Complete your web check-in now to avoid lines at the property.
            </p>
            <Link 
              to={`/web/check-in/${id || 'W123456789'}`}
              className="mt-2 w-full bg-[#F15824] hover:bg-[#d84a20] text-white font-bold text-sm py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 z-10 shadow-lg shadow-[#F15824]/20"
            >
              Finish Web Check-In
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold">Total Amount</h3>
              <span className="text-xl font-black text-white">₹3,649</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Paid Amount</span>
              <span className="text-green-400 font-medium">₹3,649</span>
            </div>
            <div className="w-full h-px bg-white/10 my-2"></div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white font-bold">Amount Due</span>
              <span className="text-white font-bold">₹0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}