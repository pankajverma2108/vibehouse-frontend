import { Link } from "react-router";
import { ChevronRight, Calendar, Users, MapPin } from "lucide-react";

export function MyBookings() {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[60vh]">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight text-white mb-6">My Bookings</h1>
        
        <div className="flex items-center gap-8 border-b border-white/10 pb-0">
          <button className="text-[#F15824] font-bold border-b-2 border-[#F15824] pb-3 text-sm px-2">
            Upcoming
          </button>
          <button className="text-gray-400 hover:text-white font-semibold pb-3 text-sm px-2 transition-colors">
            Completed
          </button>
          <button className="text-gray-400 hover:text-white font-semibold pb-3 text-sm px-2 transition-colors">
            Cancelled
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Link 
          to="/web/booking/W123456789"
          className="bg-[#1A1A1A] hover:bg-[#222222] border border-white/5 rounded-2xl p-4 md:p-6 transition-all group flex flex-col md:flex-row gap-6 relative overflow-hidden"
        >
          {/* Card left: Image */}
          <div className="w-full md:w-48 h-40 rounded-xl overflow-hidden shrink-0 relative bg-gray-800">
            <img 
              src="https://images.unsplash.com/photo-1761417327344-66e899ed9a63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3N0ZWwlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDF8fHx8MTc3NjIzNzU3MHww&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="Zostel Bangalore" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-wider border border-white/10">
              Confirmed
            </div>
          </div>

          {/* Card right: Details */}
          <div className="flex-1 flex flex-col justify-between py-1">
            <div className="flex justify-between items-start w-full">
              <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold text-white group-hover:text-[#F15824] transition-colors line-clamp-1">
                  Zostel Bangalore (Koramangala)
                </h3>
                <div className="flex flex-wrap items-center text-sm text-gray-400 gap-x-4 gap-y-2 mt-1">
                  <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                    <Calendar size={14} className="text-gray-500" />
                    Sat, 27 Jul - Mon, 29 Jul <span className="text-gray-600 ml-1">• 2N</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                    <Users size={14} className="text-gray-500" />
                    2 Guests
                  </span>
                </div>
              </div>
              <ChevronRight className="text-gray-500 group-hover:text-white transition-colors" />
            </div>

            <div className="flex items-end justify-between mt-6 border-t border-white/5 pt-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Booking ID</span>
                <span className="text-sm font-medium text-gray-300">W123456789</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Price</span>
                <span className="text-lg font-bold text-white">₹3,649</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}