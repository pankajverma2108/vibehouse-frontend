import { Link, useNavigate } from 'react-router';
import { MailCheck } from 'lucide-react';
import logoImage from 'figma:asset/81a3f660f5bff86aa9750482c0eda7c4835e704a.png';

export default function ResetEmailSentPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#230f14] flex flex-col items-center justify-center p-4 sm:p-8">
      <Link to="/" className="mb-12">
        <img src={logoImage} alt="Vibe House" className="h-10 w-auto" />
      </Link>

      <div className="bg-[#1e293b] w-full max-w-md p-8 relative rounded-[4px] border border-[#00d1ff] border-dashed shadow-2xl text-center">
        {/* Decorative Badge */}
        <div className="absolute right-[-10px] top-[-15px] rotate-6 z-10">
          <div className="bg-white px-[12px] py-[6px] relative rounded-[12px] shadow-sm border border-[rgba(0,0,0,0.1)]">
            <span className="font-['Space_Grotesk'] font-bold text-[#ff2e62] text-[10px] tracking-[1px] uppercase">
              Sent
            </span>
          </div>
        </div>

        <div className="mx-auto w-16 h-16 bg-[rgba(0,209,255,0.1)] rounded-full flex items-center justify-center mb-6 mt-2 border border-[#00d1ff] border-dashed">
          <MailCheck size={32} className="text-[#00d1ff]" />
        </div>

        <div className="flex flex-col gap-2 mb-8 text-center">
          <h1 className="font-['Space_Grotesk'] font-bold text-2xl text-white tracking-tight uppercase">
            Check your email!
          </h1>
          <p className="font-['Liberation_Serif'] italic text-[#cbd5e1] text-[15px]">
            We sent you a magic link to sign in to your account.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => navigate('/set-new-password')}
            className="w-full bg-[#00d1ff] hover:bg-[#00b0d6] text-[#230f14] font-['Space_Grotesk'] font-bold text-[15px] py-3 rounded-[4px] transition-colors uppercase tracking-wide"
          >
            Open Email App
          </button>
          
          <button className="w-full bg-transparent border border-[#64748b] hover:bg-[#0f172a] text-white font-['Space_Grotesk'] font-bold text-[15px] py-3 rounded-[4px] transition-colors uppercase tracking-wide">
            Resend Email
          </button>
        </div>
      </div>
    </div>
  );
}