import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { 
  ChevronLeft, 
  User, 
  PlusCircle, 
  CalendarCheck, 
  Tag, 
  ChevronDown, 
  Info, 
  Check, 
  Minus, 
  Plus, 
  ShieldAlert,
  X
} from 'lucide-react';

type CheckoutForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  terms1: boolean;
  coupon: string;
  addons: {
    toiletKit: number;
    bathTowel: number;
    safeLock: number;
  };
  pickup: string | null;
  terms2: boolean;
};

export default function CheckoutFlowVibrant() {
  const [step, setStep] = useState(1);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<CheckoutForm>({
    defaultValues: {
      firstName: 'Pankaj',
      lastName: 'Verma',
      email: 'build91dev1@gmail.com',
      phone: '',
      terms1: true,
      coupon: '',
      addons: {
        toiletKit: 1,
        bathTowel: 1,
        safeLock: 0,
      },
      pickup: null,
      terms2: true,
    }
  });

  const formValues = watch();

  // Prevent background scrolling when mobile summary drawer is open
  useEffect(() => {
    if (showMobileSummary) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showMobileSummary]);

  const togglePolicy = (policy: string) => {
    setExpandedPolicy(expandedPolicy === policy ? null : policy);
  };

  const handleNextStep = async () => {
    const isValid = await trigger(['firstName', 'lastName', 'email', 'phone', 'terms1']);
    if (isValid) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = (data: CheckoutForm) => {
    // Construct the payload matching the create-order endpoint expectations
    const payload = {
      property_id: "prop-bangalore-krm",
      checkin_date: "2026-04-08",
      checkout_date: "2026-04-09",
      guest: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone
      },
      rooms: [
        { room_type_id: "rt-8dorm", quantity: 1 },
        { room_type_id: "rt-6dorm", quantity: 1 }
      ],
      addons: [
        ...(data.addons.toiletKit > 0 ? [{ product_id: "prod-toilet-kit", quantity: data.addons.toiletKit }] : []),
        ...(data.addons.bathTowel > 0 ? [{ product_id: "prod-bath-towel", quantity: data.addons.bathTowel }] : []),
        ...(data.addons.safeLock > 0 ? [{ product_id: "prod-safe-lock", quantity: data.addons.safeLock }] : []),
        ...(data.pickup ? [{ product_id: `prod-pickup-${data.pickup}`, quantity: 1 }] : [])
      ],
      coupon_code: data.coupon || undefined
    };

    console.log("Submitting to /guest/booking/create-order:", payload);
    alert("Checkout state captured! Check console for API payload.");
  };

  // Calculations
  const roomCharges = 1043.25;
  const addonToilet = formValues.addons.toiletKit * 129;
  const addonTowel = formValues.addons.bathTowel * 129;
  const addonLock = formValues.addons.safeLock * 129;
  
  let pickupCharge = 0;
  if (formValues.pickup === 'airport') pickupCharge = 1999;
  if (formValues.pickup === 'ksr') pickupCharge = 1899;
  if (formValues.pickup === 'yesvantpur') pickupCharge = 1899;

  const totalExtraCharges = addonToilet + addonTowel + addonLock + pickupCharge;
  const totalCharges = roomCharges + totalExtraCharges;
  const taxes = 81.83;
  const grandTotal = totalCharges + taxes;
  const coinsEarned = Math.floor(totalCharges);

  // Shared component for the booking details to be used in Desktop Sidebar and Mobile Drawer
  const BookingBreakdown = () => (
    <>
      <div className="pt-2">
        <h4 className="font-bold text-white text-lg mb-4">The Daily Social Bangalore, Koramangala</h4>
        
        <div className="space-y-4">
          {/* Room 1 */}
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-sm text-[rgba(255,255,255,0.9)]">Bed in 8 Bed Mixed Dormitory</div>
              <div className="text-[rgba(255,255,255,0.4)] text-xs mt-1">₹508.95 /night x 1 (1 Guest)</div>
            </div>
            <div className="text-right">
              <div className="text-[rgba(255,255,255,0.4)] text-xs line-through">₹783</div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[#39ff14] text-[10px] font-bold">35% off</span>
                <span className="font-bold text-white text-sm">₹508.95</span>
              </div>
            </div>
          </div>
          
          {/* Room 2 */}
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-sm text-[rgba(255,255,255,0.9)]">Bed in 6 Bed Mixed Dormitory</div>
              <div className="text-[rgba(255,255,255,0.4)] text-xs mt-1">₹534.30 /night x 1 (1 Guest)</div>
            </div>
            <div className="text-right">
              <div className="text-[rgba(255,255,255,0.4)] text-xs line-through">₹822</div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-[#39ff14] text-[10px] font-bold">35% off</span>
                <span className="font-bold text-white text-sm">₹534.30</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Totals Breakdown */}
      <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)]">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-sm">Total rooms charges</span>
          <span className="font-bold">₹{roomCharges.toFixed(2)}</span>
        </div>

        {/* Extras if step 2 or if selected */}
        {totalExtraCharges > 0 && (
          <div className="mb-4 pt-4 border-t border-[rgba(255,255,255,0.05)] space-y-2">
            {formValues.addons.toiletKit > 0 && (
              <div className="flex justify-between items-start text-sm">
                <div>
                  <div className="font-bold text-[rgba(255,255,255,0.9)]">Toilet Kit</div>
                  <div className="text-[rgba(255,255,255,0.4)] text-xs">₹129 x {formValues.addons.toiletKit}</div>
                </div>
                <div className="font-bold">₹{addonToilet.toFixed(2)}</div>
              </div>
            )}
            {formValues.addons.bathTowel > 0 && (
              <div className="flex justify-between items-start text-sm">
                <div>
                  <div className="font-bold text-[rgba(255,255,255,0.9)]">Bath Towel</div>
                  <div className="text-[rgba(255,255,255,0.4)] text-xs">₹129 x {formValues.addons.bathTowel}</div>
                </div>
                <div className="font-bold">₹{addonTowel.toFixed(2)}</div>
              </div>
            )}
            {formValues.addons.safeLock > 0 && (
              <div className="flex justify-between items-start text-sm">
                <div>
                  <div className="font-bold text-[rgba(255,255,255,0.9)]">Safe Lock</div>
                  <div className="text-[rgba(255,255,255,0.4)] text-xs">₹129 x {formValues.addons.safeLock}</div>
                </div>
                <div className="font-bold">₹{addonLock.toFixed(2)}</div>
              </div>
            )}
            {formValues.pickup && (
              <div className="flex justify-between items-start text-sm">
                <div>
                  <div className="font-bold text-[rgba(255,255,255,0.9)]">
                    Pickup: {formValues.pickup === 'airport' ? 'Airport' : formValues.pickup === 'ksr' ? 'KSR Station' : 'Yesvantpur'}
                  </div>
                </div>
                <div className="font-bold">₹{pickupCharge.toFixed(2)}</div>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-sm">Total extra charges</span>
              <span className="font-bold">₹{totalExtraCharges.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-[rgba(255,255,255,0.1)] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-[rgba(255,255,255,0.8)]">Total charges</span>
            <span className="font-bold">₹{totalCharges.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 font-bold text-[rgba(255,255,255,0.8)]">
              Total taxes <Info className="w-3 h-3 text-[rgba(255,255,255,0.4)]" />
            </span>
            <span className="font-bold">₹{taxes.toFixed(2)}</span>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.2)] flex justify-between items-end">
          <span className="font-bold text-lg uppercase">Total price</span>
          <span className="font-bold text-2xl text-[#00f0ff]">₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-[#230f14] min-h-screen relative overflow-hidden font-['Space_Grotesk'] text-[#f1f5f9] pb-32 lg:pb-0">
      {/* Decorative Background Elements */}
      <div className="absolute bg-[rgba(198,40,40,0.08)] blur-[100px] h-[500px] right-[-100px] rounded-full top-[-50px] w-[500px] pointer-events-none" />
      <div className="absolute bg-[rgba(0,240,255,0.05)] blur-[100px] bottom-[10%] left-[-100px] rounded-full h-[400px] w-[400px] pointer-events-none" />

      {/* Header */}
      <div className="backdrop-blur-[8px] bg-[rgba(35,15,20,0.85)] border-b-2 border-[rgba(198,40,40,0.2)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/dashboard" className="flex items-center gap-2 text-[rgba(255,255,255,0.6)] hover:text-[#c62828] transition-colors group">
              <div className="bg-[rgba(255,255,255,0.05)] p-2 rounded-lg group-hover:bg-[rgba(198,40,40,0.1)] transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm uppercase tracking-wider hidden sm:inline">Back</span>
            </Link>
            
            <h1 className="font-bold text-white text-xl sm:text-2xl tracking-[2px] uppercase">
              The Daily Social
            </h1>
            
            <div className="w-10 sm:w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        
        {/* Stepper */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center w-full max-w-2xl">
            <div className="flex flex-col items-center relative z-10 w-1/3">
              <button 
                type="button"
                onClick={() => step === 2 && setStep(1)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-colors ${step >= 1 ? 'bg-[#c62828] border-black text-white' : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.5)] shadow-none'} ${step === 2 ? 'cursor-pointer hover:bg-[#a02020]' : 'cursor-default'}`}
              >
                {step > 1 ? <Check className="w-6 h-6" /> : <User className="w-6 h-6" />}
              </button>
              <span className={`mt-3 text-xs font-bold uppercase tracking-wider text-center ${step >= 1 ? 'text-white' : 'text-[rgba(255,255,255,0.5)]'}`}>Guest details</span>
            </div>
            
            <div className="flex-1 h-0.5 bg-[rgba(255,255,255,0.1)] -mx-4 relative z-0">
              <div className={`h-full transition-all duration-500 ${step >= 2 ? 'bg-[#c62828] w-full' : 'w-0'}`}></div>
            </div>
            
            <div className="flex flex-col items-center relative z-10 w-1/3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-colors ${step >= 2 ? 'bg-[#c62828] border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]' : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.5)]'}`}>
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className={`mt-3 text-xs font-bold uppercase tracking-wider text-center ${step >= 2 ? 'text-white' : 'text-[rgba(255,255,255,0.5)]'}`}>Add to your stay</span>
            </div>
            
            <div className="flex-1 h-0.5 bg-[rgba(255,255,255,0.1)] border-t border-dashed border-[rgba(255,255,255,0.3)] -mx-4 relative z-0"></div>
            
            <div className="flex flex-col items-center relative z-10 w-1/3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[rgba(255,255,255,0.05)] border-2 border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.5)]">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <span className="mt-3 text-xs font-bold uppercase tracking-wider text-center text-[rgba(255,255,255,0.5)]">Confirmation</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
          
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* STEP 1: GUEST DETAILS */}
            <div className={step === 1 ? 'block' : 'hidden'}>
              {/* Guest Details Form */}
              <div className="bg-[rgba(35,15,20,0.6)] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] mb-6">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#c62828]" />
                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-bold uppercase tracking-tight mb-6 text-white">Guest details</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-wider mb-2">First name *</label>
                      <input 
                        type="text" 
                        {...register("firstName", { required: "First name is required" })}
                        className={`w-full bg-[rgba(0,0,0,0.3)] border ${errors.firstName ? 'border-[#ff2e62]' : 'border-[rgba(255,255,255,0.1)]'} focus:border-[#c62828] focus:bg-[rgba(198,40,40,0.05)] rounded-xl p-4 text-white outline-none transition-colors`}
                      />
                      {errors.firstName && <span className="text-[#ff2e62] text-xs mt-1 block">{errors.firstName.message}</span>}
                    </div>
                    <div>
                      <label className="block text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-wider mb-2">Last name *</label>
                      <input 
                        type="text" 
                        {...register("lastName", { required: "Last name is required" })}
                        className={`w-full bg-[rgba(0,0,0,0.3)] border ${errors.lastName ? 'border-[#ff2e62]' : 'border-[rgba(255,255,255,0.1)]'} focus:border-[#c62828] focus:bg-[rgba(198,40,40,0.05)] rounded-xl p-4 text-white outline-none transition-colors`}
                      />
                      {errors.lastName && <span className="text-[#ff2e62] text-xs mt-1 block">{errors.lastName.message}</span>}
                    </div>
                    <div>
                      <label className="block text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-wider mb-2">Email *</label>
                      <input 
                        type="email" 
                        {...register("email", { 
                          required: "Email is required",
                          pattern: { value: /^\S+@\S+$/i, message: "Invalid email address" }
                        })}
                        className={`w-full bg-[rgba(0,0,0,0.3)] border ${errors.email ? 'border-[#ff2e62]' : 'border-[rgba(255,255,255,0.1)]'} focus:border-[#c62828] focus:bg-[rgba(198,40,40,0.05)] rounded-xl p-4 text-white outline-none transition-colors`}
                      />
                      {errors.email ? (
                        <span className="text-[#ff2e62] text-xs mt-1 block">{errors.email.message}</span>
                      ) : (
                        <p className="text-[rgba(255,255,255,0.4)] text-[10px] mt-1 uppercase">Confirmation email will be sent here</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[rgba(255,255,255,0.6)] text-xs uppercase tracking-wider mb-2">Phone number *</label>
                      <input 
                        type="tel" 
                        placeholder="Enter phone number"
                        {...register("phone", { required: "Phone number is required" })}
                        className={`w-full bg-[rgba(0,0,0,0.3)] border ${errors.phone ? 'border-[#ff2e62]' : 'border-[rgba(255,255,255,0.1)]'} focus:border-[#c62828] focus:bg-[rgba(198,40,40,0.05)] rounded-xl p-4 text-white outline-none transition-colors`}
                      />
                      {errors.phone ? (
                        <span className="text-[#ff2e62] text-xs mt-1 block">{errors.phone.message}</span>
                      ) : (
                        <p className="text-[rgba(255,255,255,0.4)] text-[10px] mt-1 uppercase">Helps us reach you if needed</p>
                      )}
                    </div>
                  </div>

                  <div className={`bg-[rgba(198,40,40,0.1)] border ${errors.terms1 ? 'border-[#ff2e62]' : 'border-[rgba(198,40,40,0.2)]'} rounded-xl p-4 mt-2`}>
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                        <input type="checkbox" className="peer sr-only" {...register("terms1", { required: "You must accept the terms" })} />
                        <div className={`w-5 h-5 border-2 rounded transition-colors ${formValues.terms1 ? 'bg-[#c62828] border-[#c62828]' : 'border-[rgba(255,255,255,0.3)]'} ${errors.terms1 ? 'border-[#ff2e62]' : ''}`}></div>
                        <Check className={`w-3 h-3 text-white absolute transition-opacity ${formValues.terms1 ? 'opacity-100' : 'opacity-0'}`} strokeWidth={4} />
                      </div>
                      <span className="text-[rgba(255,255,255,0.8)] text-sm leading-snug">
                        Yes, I confirm <strong className="text-white">all the guests are above 18 year old</strong> and I acknowledge and accept the <a href="#" className="text-[#00f0ff] hover:underline">Terms of Booking Conditions, Cancellation Policy & Property Policy.</a>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Coupon Codes */}
              <div className="bg-[rgba(35,15,20,0.6)] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] mb-6">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#ffdf00]" />
                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-bold uppercase tracking-tight mb-6 text-white flex items-center gap-2">
                    <Tag className="w-6 h-6 text-[#ffdf00]" /> Coupon codes
                  </h2>
                  
                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      placeholder="Have a coupon code?"
                      value={formValues.coupon}
                      onChange={(e) => setValue('coupon', e.target.value)}
                      className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.1)] focus:border-[#ffdf00] rounded-xl p-4 text-white outline-none transition-colors" 
                    />
                    <button type="button" className="bg-[rgba(255,223,0,0.1)] border-2 border-[#ffdf00] text-[#ffdf00] px-6 rounded-xl font-bold uppercase hover:bg-[#ffdf00] hover:text-black transition-colors">
                      Apply
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { code: 'WORKATION', desc: 'Flat 15% off on workation plans' },
                      { code: 'GROUP10', desc: 'Flat 10% off on group booking (7+ adults)' },
                      { code: 'NEWSIGNUP', desc: 'New user signup 5% OFF' }
                    ].map((coupon) => (
                      <label key={coupon.code} className={`block border rounded-xl p-4 cursor-pointer transition-colors ${formValues.coupon === coupon.code ? 'border-[#ffdf00] bg-[rgba(255,223,0,0.05)]' : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)] bg-[rgba(0,0,0,0.2)]'}`}>
                        <div className="flex items-start gap-3">
                          <input 
                            type="radio" 
                            name="couponRadio"
                            value={coupon.code}
                            checked={formValues.coupon === coupon.code}
                            onChange={() => setValue('coupon', coupon.code)}
                            className="mt-1 accent-[#ffdf00]" 
                          />
                          <div>
                            <div className="font-bold text-white uppercase tracking-wider mb-1">{coupon.code}</div>
                            <div className="text-[#39ff14] text-sm font-bold mb-1">{coupon.desc}</div>
                            <div className="text-[rgba(255,255,255,0.4)] text-[10px] uppercase">Terms & Conditions</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Booking Policies */}
              <div className="bg-[rgba(35,15,20,0.6)] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#00f0ff]" />
                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-bold uppercase tracking-tight mb-4 text-white flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-[#00f0ff]" /> Booking policies
                  </h2>
                  
                  <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {['General policy', 'Cancellation policy', 'Commune policy', 'Loyalty coins policy', 'Privacy policy', 'Terms'].map((policy) => (
                      <div key={policy} className="py-2">
                        <button 
                          type="button"
                          onClick={() => togglePolicy(policy)}
                          className="w-full py-3 flex items-center justify-between text-left focus:outline-none group"
                        >
                          <span className="font-medium text-[rgba(255,255,255,0.8)] group-hover:text-white transition-colors">{policy}</span>
                          <ChevronDown className={`w-5 h-5 text-[rgba(255,255,255,0.4)] group-hover:text-white transition-transform ${expandedPolicy === policy ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedPolicy === policy && (
                          <div className="pb-4 text-sm text-[rgba(255,255,255,0.6)] leading-relaxed">
                            This is the detailed information for the {policy.toLowerCase()}. Standard hosteling rules apply. Ensure you read carefully before confirming your stay.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: ADD-ONS */}
            <div className={step === 2 ? 'block' : 'hidden'}>
              {/* Add Essentials */}
              <div className="bg-[rgba(35,15,20,0.6)] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] mb-6">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#ffdf00]" />
                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-bold uppercase tracking-tight mb-6 text-white">Add essentials</h2>
                  
                  <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {/* Toilet Kit */}
                    <div className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[rgba(255,223,0,0.1)] rounded-xl flex items-center justify-center border border-[rgba(255,223,0,0.3)]">
                          <span className="text-2xl">🧴</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">Toilet Kit</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[rgba(255,255,255,0.4)] line-through text-sm">₹141.9</span>
                            <span className="text-white font-bold">₹129</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-[rgba(0,0,0,0.4)] p-1 rounded-lg border border-[rgba(255,255,255,0.1)]">
                        <button 
                          type="button"
                          onClick={() => setValue('addons.toiletKit', Math.max(0, formValues.addons.toiletKit - 1))}
                          className="w-8 h-8 flex items-center justify-center text-[#ffdf00] hover:bg-[rgba(255,223,0,0.1)] rounded-md transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold w-4 text-center">{formValues.addons.toiletKit}</span>
                        <button 
                          type="button"
                          onClick={() => setValue('addons.toiletKit', formValues.addons.toiletKit + 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#ffdf00] hover:bg-[rgba(255,223,0,0.1)] rounded-md transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bath Towel */}
                    <div className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[rgba(255,223,0,0.1)] rounded-xl flex items-center justify-center border border-[rgba(255,223,0,0.3)]">
                          <span className="text-2xl">🧺</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">Bath Towel</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[rgba(255,255,255,0.4)] line-through text-sm">₹141.9</span>
                            <span className="text-white font-bold">₹129</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-[rgba(0,0,0,0.4)] p-1 rounded-lg border border-[rgba(255,255,255,0.1)]">
                        <button 
                          type="button"
                          onClick={() => setValue('addons.bathTowel', Math.max(0, formValues.addons.bathTowel - 1))}
                          className="w-8 h-8 flex items-center justify-center text-[#ffdf00] hover:bg-[rgba(255,223,0,0.1)] rounded-md transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold w-4 text-center">{formValues.addons.bathTowel}</span>
                        <button 
                          type="button"
                          onClick={() => setValue('addons.bathTowel', formValues.addons.bathTowel + 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#ffdf00] hover:bg-[rgba(255,223,0,0.1)] rounded-md transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Safe Lock */}
                    <div className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[rgba(255,223,0,0.1)] rounded-xl flex items-center justify-center border border-[rgba(255,223,0,0.3)]">
                          <span className="text-2xl">🔒</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">Safe Lock</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[rgba(255,255,255,0.4)] line-through text-sm">₹141.9</span>
                            <span className="text-white font-bold">₹129</span>
                          </div>
                        </div>
                      </div>
                      {formValues.addons.safeLock === 0 ? (
                        <button 
                          type="button"
                          onClick={() => setValue('addons.safeLock', 1)}
                          className="bg-[#ffdf00] text-black px-6 py-2 rounded-lg font-bold uppercase text-sm hover:bg-white transition-colors"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 bg-[rgba(0,0,0,0.4)] p-1 rounded-lg border border-[rgba(255,255,255,0.1)]">
                          <button 
                            type="button"
                            onClick={() => setValue('addons.safeLock', Math.max(0, formValues.addons.safeLock - 1))}
                            className="w-8 h-8 flex items-center justify-center text-[#ffdf00] hover:bg-[rgba(255,223,0,0.1)] rounded-md transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-4 text-center">{formValues.addons.safeLock}</span>
                          <button 
                            type="button"
                            onClick={() => setValue('addons.safeLock', formValues.addons.safeLock + 1)}
                            className="w-8 h-8 flex items-center justify-center text-[#ffdf00] hover:bg-[rgba(255,223,0,0.1)] rounded-md transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Pick up */}
              <div className="bg-[rgba(35,15,20,0.6)] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden relative shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#00f0ff]" />
                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-bold uppercase tracking-tight mb-6 text-white">Add pick up</h2>
                  
                  <div className="divide-y divide-[rgba(255,255,255,0.05)]">
                    {/* Airport */}
                    <div className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[rgba(0,240,255,0.1)] rounded-xl flex items-center justify-center border border-[rgba(0,240,255,0.3)]">
                          <span className="text-2xl">✈️</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">Kempegowda International Airport</h4>
                          <div className="text-[rgba(255,255,255,0.5)] text-sm">Starts at ₹1999</div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setValue('pickup', formValues.pickup === 'airport' ? null : 'airport')}
                        className={`px-6 py-2 rounded-lg font-bold uppercase text-sm transition-colors border ${formValues.pickup === 'airport' ? 'bg-[rgba(198,40,40,0.2)] text-[#c62828] border-[#c62828] hover:bg-[rgba(198,40,40,0.3)]' : 'bg-[rgba(0,240,255,0.2)] text-[#00f0ff] border-[#00f0ff] hover:bg-[#00f0ff] hover:text-black'}`}
                      >
                        {formValues.pickup === 'airport' ? 'Remove' : 'Add'}
                      </button>
                    </div>

                    {/* KSR */}
                    <div className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[rgba(0,240,255,0.1)] rounded-xl flex items-center justify-center border border-[rgba(0,240,255,0.3)]">
                          <span className="text-2xl">🚂</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">KSR Railway Station</h4>
                          <div className="text-[rgba(255,255,255,0.5)] text-sm">Starts at ₹1899</div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setValue('pickup', formValues.pickup === 'ksr' ? null : 'ksr')}
                        className={`px-6 py-2 rounded-lg font-bold uppercase text-sm transition-colors border ${formValues.pickup === 'ksr' ? 'bg-[rgba(198,40,40,0.2)] text-[#c62828] border-[#c62828] hover:bg-[rgba(198,40,40,0.3)]' : 'bg-[rgba(0,240,255,0.2)] text-[#00f0ff] border-[#00f0ff] hover:bg-[#00f0ff] hover:text-black'}`}
                      >
                        {formValues.pickup === 'ksr' ? 'Remove' : 'Add'}
                      </button>
                    </div>

                    {/* Yesvantpur */}
                    <div className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[rgba(0,240,255,0.1)] rounded-xl flex items-center justify-center border border-[rgba(0,240,255,0.3)]">
                          <span className="text-2xl">🚉</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">Yesvantpur Railway Station</h4>
                          <div className="text-[rgba(255,255,255,0.5)] text-sm">Starts at ₹1899</div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setValue('pickup', formValues.pickup === 'yesvantpur' ? null : 'yesvantpur')}
                        className={`px-6 py-2 rounded-lg font-bold uppercase text-sm transition-colors border ${formValues.pickup === 'yesvantpur' ? 'bg-[rgba(198,40,40,0.2)] text-[#c62828] border-[#c62828] hover:bg-[rgba(198,40,40,0.3)]' : 'bg-[rgba(0,240,255,0.2)] text-[#00f0ff] border-[#00f0ff] hover:bg-[#00f0ff] hover:text-black'}`}
                      >
                        {formValues.pickup === 'yesvantpur' ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Desktop Right Column (Sticky Sidebar) */}
          <div className="hidden lg:block lg:col-span-1 space-y-6">
            <div className="bg-[rgba(35,15,20,0.8)] border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden sticky top-28 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
              <div className="p-6 border-b border-[rgba(255,255,255,0.1)] relative overflow-hidden">
                {/* Brand color accent banner */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#c62828]" />
                
                <h3 className="font-bold text-xl uppercase tracking-tight text-white mb-6">Booking details</h3>
                
                {/* Dates */}
                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <div className="text-[rgba(255,255,255,0.5)] text-[10px] uppercase tracking-widest mb-1">Check-in</div>
                    <div className="font-bold text-white">08 Apr, 2026</div>
                    <div className="text-[rgba(255,255,255,0.4)] text-[10px]">from 02:00 PM</div>
                  </div>
                  
                  {/* Visual connector */}
                  <div className="flex-1 px-4 relative z-10 flex justify-center">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-[rgba(255,255,255,0.2)] -z-10"></div>
                    <div className="bg-[#ffdf00] text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase">1 Night</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[rgba(255,255,255,0.5)] text-[10px] uppercase tracking-widest mb-1">Check-out</div>
                    <div className="font-bold text-white">09 Apr, 2026</div>
                    <div className="text-[rgba(255,255,255,0.4)] text-[10px]">by 11:00 AM</div>
                  </div>
                </div>

                <BookingBreakdown />
              </div>

              {/* Earn Coins Box */}
              <div className="px-6 py-4 bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <span className="text-sm font-medium">You will earn <strong className="text-[#ffdf00]">{coinsEarned} coins</strong> on this booking</span>
                </div>
              </div>

              {/* Checkbox for Step 2 */}
              {step === 2 && (
                <div className="p-6 pb-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                      <input type="checkbox" className="peer sr-only" {...register("terms2", { required: "You must confirm the guests are 18+" })} />
                      <div className={`w-4 h-4 border rounded transition-colors ${formValues.terms2 ? 'bg-[#c62828] border-[#c62828]' : 'border-[rgba(255,255,255,0.3)]'} ${errors.terms2 ? 'border-[#ff2e62]' : ''}`}></div>
                      <Check className={`w-3 h-3 text-white absolute transition-opacity ${formValues.terms2 ? 'opacity-100' : 'opacity-0'}`} strokeWidth={4} />
                    </div>
                    <span className="text-[rgba(255,255,255,0.6)] text-[10px] leading-tight">
                      Yes, I confirm <strong className="text-[rgba(255,255,255,0.8)]">all the guests are above 18 year old</strong> and I acknowledge and accept the <a href="#" className="text-[#00f0ff] hover:underline">Terms of Booking Conditions, Cancellation Policy & Property Policy.</a>
                    </span>
                  </label>
                  {errors.terms2 && <span className="text-[#ff2e62] text-[10px] mt-1 block pl-7">{errors.terms2.message}</span>}
                </div>
              )}

              {/* Desktop Action Button */}
              <div className="p-6 pt-4">
                {step === 1 ? (
                  <button 
                    type="button"
                    onClick={handleNextStep}
                    className="w-full bg-[#c62828] hover:bg-[#a02020] text-white py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px]"
                  >
                    Continue to add-ons
                  </button>
                ) : (
                  <button 
                    type="submit"
                    className="w-full bg-[#c62828] hover:bg-[#a02020] text-white py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px]"
                  >
                    Continue to payment
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE FIXED BOTTOM BAR */}
          <div className="lg:hidden fixed bottom-0 left-0 w-full bg-[rgba(35,15,20,0.95)] backdrop-blur-md border-t border-[rgba(255,255,255,0.1)] z-50 pb-safe">
            {/* Red Accent Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#c62828]" />
            
            {step === 2 && (
              <div className="px-4 pt-3 pb-1 border-b border-[rgba(255,255,255,0.05)]">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                    <input type="checkbox" className="peer sr-only" {...register("terms2", { required: "You must confirm the guests are 18+" })} />
                    <div className={`w-3.5 h-3.5 border rounded transition-colors ${formValues.terms2 ? 'bg-[#c62828] border-[#c62828]' : 'border-[rgba(255,255,255,0.3)]'} ${errors.terms2 ? 'border-[#ff2e62]' : ''}`}></div>
                    <Check className={`w-2.5 h-2.5 text-white absolute transition-opacity ${formValues.terms2 ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                  </div>
                  <span className="text-[rgba(255,255,255,0.6)] text-[10px] leading-tight">
                    I confirm <strong className="text-white">all guests are 18+</strong> and accept the policies.
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-between p-4 px-5">
              <div>
                <div className="text-xl font-bold text-white mb-0.5">₹{grandTotal.toFixed(2)}</div>
                <button 
                  type="button" 
                  onClick={() => setShowMobileSummary(true)} 
                  className="text-[#00f0ff] hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  Price breakup <Info className="w-3 h-3" />
                </button>
              </div>
              <div>
                {step === 1 ? (
                  <button 
                    type="button" 
                    onClick={handleNextStep} 
                    className="bg-[#ffdf00] text-black px-6 py-3 rounded-lg font-bold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-all"
                  >
                    Continue
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="bg-[#ffdf00] text-black px-6 py-3 rounded-lg font-bold text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] transition-all"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE SUMMARY DRAWER (Slide Up) */}
          <div className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${showMobileSummary ? 'bg-black/80 pointer-events-auto' : 'bg-transparent pointer-events-none'}`}>
            <div 
              className={`absolute bottom-0 left-0 w-full bg-[#1c0c10] border-t border-[rgba(255,255,255,0.1)] rounded-t-3xl transition-transform duration-300 transform ${showMobileSummary ? 'translate-y-0' : 'translate-y-full'} max-h-[85vh] flex flex-col`}
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center sticky top-0 bg-[#1c0c10] z-10 rounded-t-3xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#c62828] rounded-t-3xl" />
                <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#ffdf00]"></div> Booking details
                </h2>
                <button 
                  type="button" 
                  onClick={() => setShowMobileSummary(false)} 
                  className="p-2 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 overflow-y-auto">
                <div className="flex items-center justify-between mb-6 relative">
                  <div>
                    <div className="text-[rgba(255,255,255,0.5)] text-[10px] uppercase tracking-widest mb-1">Check-in</div>
                    <div className="font-bold text-white">08 Apr, 2026</div>
                    <div className="text-[rgba(255,255,255,0.4)] text-[10px]">from 02:00 PM</div>
                  </div>
                  
                  <div className="flex-1 px-4 relative z-10 flex justify-center">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-[rgba(255,255,255,0.2)] -z-10"></div>
                    <div className="bg-[#ffdf00] text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase">1 Night</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[rgba(255,255,255,0.5)] text-[10px] uppercase tracking-widest mb-1">Check-out</div>
                    <div className="font-bold text-white">09 Apr, 2026</div>
                    <div className="text-[rgba(255,255,255,0.4)] text-[10px]">by 11:00 AM</div>
                  </div>
                </div>

                <BookingBreakdown />
              </div>
            </div>
          </div>
          
        </form>
      </div>
    </div>
  );
}