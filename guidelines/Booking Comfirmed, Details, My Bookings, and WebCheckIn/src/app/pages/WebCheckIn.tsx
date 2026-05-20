import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, ChevronRight, UploadCloud, Info } from "lucide-react";

type Step = 1 | 2 | 3;

export function WebCheckIn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);

  // Modals for Step 2
  const [showCropModal, setShowCropModal] = useState(false);
  const [showBackModal, setShowBackModal] = useState(false);
  const [idFrontUploaded, setIdFrontUploaded] = useState(false);
  const [idBackUploaded, setIdBackUploaded] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "Ritik",
    lastName: "Singh",
    email: "ritik11@yopmail.com",
    dob: "1998-11-11",
    gender: "Male",
    nationality: "Indian",
    address: "Bangalore, 560034",
    idType: "",
    arrivalTime: "12:00 PM - 02:00 PM",
    comingFrom: "Delhi",
    nextDestination: "Mysore"
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, 3) as Step);
  const prevStep = () => {
    if (step === 1) navigate(-1);
    else setStep((s) => Math.max(s - 1, 1) as Step);
  };

  const handleFinish = () => {
    // Navigate to confirmed/success screen
    navigate(`/web/booking/${id}/confirmed`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-[60vh] text-white pb-12 relative">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={prevStep} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black tracking-tight">Web Check-In</h1>
      </div>

      <div className="flex items-center gap-2 mb-10 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className={`flex items-center gap-2 text-sm font-bold tracking-wide ${step >= 1 ? 'text-[#F15824]' : 'text-gray-500'}`}>
          Basic Info
        </div>
        <div className="h-px w-6 bg-white/20 mx-2"></div>
        <div className={`flex items-center gap-2 text-sm font-bold tracking-wide ${step >= 2 ? 'text-[#F15824]' : 'text-gray-500'}`}>
          Gov. ID
        </div>
        <div className="h-px w-6 bg-white/20 mx-2"></div>
        <div className={`flex items-center gap-2 text-sm font-bold tracking-wide ${step >= 3 ? 'text-[#F15824]' : 'text-gray-500'}`}>
          Time
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col gap-6">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-6">Basic Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">First Name</label>
                <input 
                  type="text" 
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Last Name</label>
                <input 
                  type="text" 
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors" 
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors opacity-70 cursor-not-allowed" 
                  disabled
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date of Birth</label>
                <input 
                  type="date" 
                  value={formData.dob}
                  onChange={e => setFormData({...formData, dob: e.target.value})}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors [color-scheme:dark]" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gender</label>
                <select 
                  value={formData.gender}
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors appearance-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nationality</label>
                <select 
                  value={formData.nationality}
                  onChange={e => setFormData({...formData, nationality: e.target.value})}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors appearance-none"
                >
                  <option value="Indian">Indian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Address</label>
                <textarea 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors resize-none" 
                />
              </div>
            </div>
            
            <button 
              onClick={nextStep}
              className="mt-8 w-full bg-[#F15824] hover:bg-[#d84a20] text-white font-bold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-2">Just one ID needed</h2>
            <p className="text-sm text-gray-400 mb-8 flex items-center gap-2">
              <Info size={16} className="text-[#F15824]" /> Choose one document to upload
            </p>

            <div className="flex flex-col gap-4 mb-8">
              {['Aadhar', 'Passport', 'Driving License', 'Voter ID'].map((idStr) => (
                <button
                  key={idStr}
                  onClick={() => {
                    setFormData({...formData, idType: idStr});
                    if(!idFrontUploaded) setShowCropModal(true);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                    formData.idType === idStr 
                      ? 'border-[#F15824] bg-[#F15824]/5 text-[#F15824]' 
                      : 'border-white/10 bg-[#212121] text-white hover:border-white/30'
                  }`}
                >
                  <span className="font-semibold tracking-wide">{idStr}</span>
                  {formData.idType === idStr && idFrontUploaded && idBackUploaded && (
                    <CheckCircle2 size={20} className="text-green-500" />
                  )}
                  {formData.idType === idStr && (!idFrontUploaded || !idBackUploaded) && (
                    <UploadCloud size={20} className="text-[#F15824]" />
                  )}
                </button>
              ))}
            </div>

            <button 
              onClick={nextStep}
              disabled={!idFrontUploaded || !idBackUploaded}
              className={`w-full font-bold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                idFrontUploaded && idBackUploaded 
                  ? 'bg-[#F15824] hover:bg-[#d84a20] text-white' 
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold mb-6">Final Details</h2>
            
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Time of Arrival</label>
                <select 
                  value={formData.arrivalTime}
                  onChange={e => setFormData({...formData, arrivalTime: e.target.value})}
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors appearance-none"
                >
                  <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                  <option value="12:00 PM - 02:00 PM">12:00 PM - 02:00 PM</option>
                  <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                  <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coming From</label>
                <input 
                  type="text" 
                  value={formData.comingFrom}
                  onChange={e => setFormData({...formData, comingFrom: e.target.value})}
                  placeholder="e.g. Delhi"
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors" 
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Next Destination</label>
                <input 
                  type="text" 
                  value={formData.nextDestination}
                  onChange={e => setFormData({...formData, nextDestination: e.target.value})}
                  placeholder="e.g. Mysore"
                  className="bg-[#212121] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F15824] transition-colors" 
                />
              </div>
            </div>

            <button 
              onClick={handleFinish}
              className="mt-8 w-full bg-[#F15824] hover:bg-[#d84a20] text-white font-bold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(241,88,36,0.3)]"
            >
              Finish Check-in
            </button>
          </div>
        )}
      </div>

      {/* Crop Modal (Front) */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A1A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-lg">Crop Image</h3>
              <button onClick={() => setShowCropModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-full aspect-[1.6] bg-gray-800 rounded-lg mb-6 overflow-hidden relative border border-dashed border-gray-600">
                <img src="https://images.unsplash.com/photo-1635231152740-dcfba853f33d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpZCUyMGNhcmQlMjBkb2N1bWVudHxlbnwxfHx8fDE3NzYyMzc1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080" alt="ID Card" className="w-full h-full object-cover opacity-80 mix-blend-screen" />
                {/* Simulated crop overlay */}
                <div className="absolute inset-4 border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white -mb-1 -mr-1"></div>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-6 text-center">Make sure the details on the front of the ID are clearly visible</p>
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setShowCropModal(false)}
                  className="flex-1 py-3 px-4 rounded-lg font-bold border border-white/20 text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowCropModal(false);
                    setIdFrontUploaded(true);
                    setTimeout(() => setShowBackModal(true), 300);
                  }}
                  className="flex-1 py-3 px-4 rounded-lg font-bold bg-[#F15824] text-white hover:bg-[#d84a20] transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Back Modal */}
      {showBackModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A1A] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-lg">ID Card Back</h3>
              <button onClick={() => setShowBackModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-full aspect-[1.6] bg-gray-800 rounded-lg mb-6 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1635231152740-dcfba853f33d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpZCUyMGNhcmQlMjBkb2N1bWVudHxlbnwxfHx8fDE3NzYyMzc1NzB8MA&ixlib=rb-4.1.0&q=80&w=1080" alt="ID Card Back" className="w-full h-full object-cover filter brightness-75 grayscale sepia hue-rotate-180" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white flex-col gap-2">
                  <CheckCircle2 size={48} className="text-green-500 bg-white rounded-full" />
                  <span className="font-bold">Uploaded Successfully</span>
                </div>
              </div>
              <div className="flex gap-4 w-full flex-col">
                <button 
                  onClick={() => {
                    setShowBackModal(false);
                    setIdBackUploaded(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-lg font-bold bg-[#F15824] text-white hover:bg-[#d84a20] transition-colors"
                >
                  Continue
                </button>
                <button 
                  onClick={() => {
                    setShowBackModal(false);
                    setShowCropModal(true); // Restart process
                  }}
                  className="w-full py-3.5 px-4 rounded-lg font-bold border border-white/20 text-white hover:bg-white/5 transition-colors"
                >
                  Upload Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}