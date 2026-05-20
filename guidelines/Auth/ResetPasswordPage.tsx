import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Mail } from 'lucide-react';
import logoImage from 'figma:asset/81a3f660f5bff86aa9750482c0eda7c4835e704a.png';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#230f14] flex flex-col items-center justify-center p-4 sm:p-8">
      <Link to="/" className="mb-12">
        <img src={logoImage} alt="Vibe House" className="h-10 w-auto" />
      </Link>

      <div className="bg-[#1e293b] w-full max-w-md p-8 relative rounded-[4px] border border-[#facc15] border-dashed shadow-2xl">
        {/* Decorative Badge */}
        <div className="absolute right-[-10px] top-[-15px] rotate-12 z-10">
          <div className="bg-[#fef08a] px-[12px] py-[6px] relative rounded-[4px] shadow-md border border-[rgba(0,0,0,0.1)]">
            <span className="font-['Liberation_Serif'] italic text-[12px] text-black font-bold">
              Action Required!
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-8 text-center mt-2">
          <h1 className="font-['Space_Grotesk'] font-bold text-2xl text-white tracking-tight uppercase">
            Reset Password
          </h1>
          <p className="font-['Liberation_Serif'] italic text-[#cbd5e1] text-[15px]">
            Enter your email address and we will send you a link to reset your password.
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={(e) => {
          e.preventDefault();
          navigate('/reset-email-sent');
        }}>
          <div className="flex flex-col gap-2">
            <label className="font-['Space_Grotesk'] text-sm text-[#cbd5e1] font-medium">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-[#64748b]" />
              </div>
              <input 
                type="email" 
                defaultValue="team@mynaui.com"
                placeholder="email@example.com"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-[4px] pl-10 pr-4 py-3 text-white placeholder-[#64748b] focus:outline-none focus:border-[#facc15] focus:ring-1 focus:ring-[#facc15] transition-all font-['Space_Grotesk']"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-[#facc15] hover:bg-[#e0b710] text-[#230f14] font-['Space_Grotesk'] font-bold text-[15px] py-3 rounded-[4px] transition-colors uppercase tracking-wide mt-2">
            Send Reset Email
          </button>

          <Link to="/login" className="flex items-center justify-center gap-2 text-[#00d1ff] hover:text-white transition-colors font-['Space_Grotesk'] text-sm mt-4">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
}