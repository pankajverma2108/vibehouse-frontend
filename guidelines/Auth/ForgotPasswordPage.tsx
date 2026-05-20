import { Link } from 'react-router';
import { ArrowLeft, Mail } from 'lucide-react';
import logoImage from 'figma:asset/81a3f660f5bff86aa9750482c0eda7c4835e704a.png';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#230f14] flex flex-col items-center justify-center p-4 sm:p-8">
      <Link to="/" className="mb-12">
        <img src={logoImage} alt="Vibe House" className="h-10 w-auto" />
      </Link>

      <div className="bg-[#1e293b] w-full max-w-md p-8 relative rounded-[4px] border border-[rgba(255,255,255,0.1)] shadow-2xl">
        <div className="flex flex-col gap-2 mb-8 text-center">
          <h1 className="font-['Space_Grotesk'] font-bold text-2xl text-white tracking-tight uppercase">
            Forgot Password?
          </h1>
          <p className="font-['Liberation_Serif'] italic text-[#cbd5e1] text-[15px]">
            Lost your password? No worries! Pop in your email, and we'll zap you a reset link!
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-2">
            <label className="font-['Space_Grotesk'] text-sm text-[#cbd5e1] font-medium">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-[#64748b]" />
              </div>
              <input 
                type="email" 
                placeholder="adam@example.com"
                className="w-full bg-[#0f172a] border border-[#334155] rounded-[4px] pl-10 pr-4 py-3 text-white placeholder-[#64748b] focus:outline-none focus:border-[#ff2e62] focus:ring-1 focus:ring-[#ff2e62] transition-all font-['Space_Grotesk']"
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-[#ff2e62] hover:bg-[#e01f4f] text-white font-['Space_Grotesk'] font-bold text-[15px] py-3 rounded-[4px] transition-colors uppercase tracking-wide mt-2">
            Send Reset Link
          </button>

          <Link to="/login" className="flex items-center justify-center gap-2 text-[#00d1ff] hover:text-white transition-colors font-['Space_Grotesk'] text-sm mt-4">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </form>
      </div>

      <div className="mt-12 flex gap-4 text-sm text-[#64748b] font-['Space_Grotesk']">
        <a href="#" className="hover:text-white transition-colors">Legal</a>
        <span>•</span>
        <a href="#" className="hover:text-white transition-colors">Help</a>
      </div>
    </div>
  );
}