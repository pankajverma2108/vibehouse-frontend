import React from 'react';

export default function TicketReceiptPage() {
  const receiptData = {
    guestName: "Adam Smith",
    bookingId: "8XJ23K",
    confirmationCode: "Z9L2P",
    propertyName: "The Daily Social",
    address: "Koramangala A, Bengaluru, India",
    checkIn: "12 Oct 2026",
    checkInTime: "14:00",
    checkOut: "12 Nov 2026",
    checkOutTime: "11:00",
    guests: "1 Adult",
    nights: "30 Nights",
    total: "35,000",
    date: "14 Sep 2026",
  };

  return (
    <>
      {/* Standalone Font Import */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Geologica:wght@400..900&display=swap');
      `}} />
      
      <div 
        className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8"
        style={{ fontFamily: "'Geologica', sans-serif" }}
      >
        
        {/* Optional: Navigation back */}
        <div className="w-[595px] flex justify-between items-center mb-6">
          <a href="/" className="text-gray-400 hover:text-white text-sm font-medium tracking-wide transition-colors">
            ← Back to Home
          </a>
          <button 
            onClick={() => window.print()}
            className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded text-sm font-medium transition-colors border border-[#333]"
          >
            Print / Save
          </button>
        </div>

        {/* A4 Container */}
        <div className="w-[595px] min-h-[842px] bg-white text-black flex relative shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-[595px]">
          
          {/* SIDE TICKET STRIP */}
          <div className="w-16 bg-[#000000] text-white flex flex-col items-center justify-center relative z-10 shrink-0 overflow-hidden">
            <div className="-rotate-90 whitespace-nowrap text-[12px] tracking-[0.4em] font-medium uppercase text-gray-400 flex gap-12">
              <span>BOOKING ID — {receiptData.bookingId}</span>
              <span>CONFIRMATION — {receiptData.confirmationCode}</span>
            </div>
            
            {/* Perforation holes on the right edge of the side strip to enhance ticket look */}
            <div className="absolute -right-[1.5px] top-12 w-3 h-3 bg-[#0a0a0a] rounded-full translate-x-1/2"></div>
            <div className="absolute -right-[1.5px] bottom-12 w-3 h-3 bg-[#0a0a0a] rounded-full translate-x-1/2"></div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col bg-white">
            
            {/* HERO STRIP */}
            <div className="bg-[#c62828] px-10 py-12 flex justify-between items-start">
              <div className="w-14 h-14 bg-black rounded flex items-center justify-center p-2 shadow-lg">
                {/* Standalone Inline SVG Logo Placeholder */}
                <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              
              <div className="text-right flex flex-col items-end">
                <h1 className="font-black text-6xl leading-[0.85] tracking-tight uppercase text-black mb-3">
                  Booking<br/>Confirmed
                </h1>
                <p className="text-[11px] font-bold text-black/70 uppercase tracking-[0.25em]">
                  Your stay is locked in
                </p>
              </div>
            </div>

            {/* MAIN TICKET BODY */}
            <div className="px-10 py-10 flex-1 flex flex-col relative">
              
              {/* PROPERTY BLOCK */}
              <div className="mb-8">
                <h2 className="text-4xl font-black uppercase text-gray-900 tracking-tight leading-none mb-2">
                  {receiptData.propertyName}
                </h2>
                <p className="text-gray-500 font-medium text-sm tracking-wide">
                  {receiptData.address}
                </p>
              </div>

              {/* DIVIDER */}
              <div className="relative w-full h-0 border-t-[3px] border-dashed border-gray-300 my-10">
                {/* Left cutout */}
                <div className="absolute top-1/2 left-[-40px] -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#0a0a0a] rounded-full print:bg-white"></div>
                {/* Right cutout */}
                <div className="absolute top-1/2 right-[-40px] translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#0a0a0a] rounded-full print:bg-white"></div>
              </div>

              {/* STAY DETAILS GRID */}
              <div className="grid grid-cols-2 gap-y-10 gap-x-6 mb-12">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Check-in</p>
                  <p className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{receiptData.checkIn}</p>
                  <p className="text-sm text-gray-500 font-medium">{receiptData.checkInTime}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Check-out</p>
                  <p className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{receiptData.checkOut}</p>
                  <p className="text-sm text-gray-500 font-medium">{receiptData.checkOutTime}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Guests</p>
                  <p className="text-xl font-bold text-gray-900">{receiptData.guests}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Duration</p>
                  <p className="text-xl font-bold text-gray-900">{receiptData.nights}</p>
                </div>
              </div>

              {/* GUEST BLOCK */}
              <div className="mb-auto">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Passenger</p>
                <p className="text-3xl font-black uppercase text-gray-900 tracking-tight">
                  {receiptData.guestName}
                </p>
              </div>

              {/* QR CODE & FOOTER */}
              <div className="flex justify-between items-end mt-12">
                <div className="text-[10px] text-gray-400 font-medium space-y-2 uppercase tracking-wider">
                  <p>Generated on {receiptData.date}</p>
                  <p>support@vibehouse.com</p>
                </div>
                
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 bg-white border-[3px] border-gray-900 p-2">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=vibehouse-${receiptData.bookingId}`} 
                      alt="QR Code" 
                      className="w-full h-full"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    Scan to view booking
                  </p>
                </div>
              </div>

            </div>

            {/* PAYMENT STRIP */}
            <div className="bg-[#000000] px-10 py-8 flex justify-between items-center mt-auto">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Total Paid</p>
              <p className="text-5xl font-black tracking-tighter text-[#ffffff]">₹{receiptData.total}</p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}