import { Link, useParams } from 'react-router';
import { Mail, MessageCircle, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function PoliciesPage() {
  const { type } = useParams<{ type: string }>();
  const [activeSection, setActiveSection] = useState<string>('');

  const policyContent: Record<string, {
    title: string;
    lastUpdated: string;
    sections: { id: string; title: string; content: string[] }[];
  }> = {
    guest: {
      title: 'Guest Policies',
      lastUpdated: 'March 1, 2026',
      sections: [
        {
          id: 'check-in-out',
          title: 'Check-In & Check-Out',
          content: [
            'Check-in time is 2:00 PM. Early check-in may be available upon request, subject to availability.',
            'Check-out time is 11:00 AM. Late check-out is available for an additional fee, subject to room availability.',
            'Valid government-issued photo ID is mandatory for all guests during check-in.',
            'Guests under 18 must be accompanied by a parent or legal guardian.',
          ],
        },
        {
          id: 'payment',
          title: 'Payment & Cancellation',
          content: [
            'Full payment is required at the time of booking unless otherwise specified.',
            'We accept cash, credit/debit cards, UPI, and online bank transfers.',
            'Free cancellation up to 7 days before arrival. Cancellations within 7 days are non-refundable.',
            'No-shows will be charged the full booking amount.',
          ],
        },
        {
          id: 'house-rules',
          title: 'House Rules',
          content: [
            'Quiet hours are enforced between 11:00 PM and 7:00 AM in dorm areas.',
            'Smoking is strictly prohibited inside the hostel. Designated smoking areas are available.',
            'Outside guests are not permitted in dorm rooms without prior approval from management.',
            'Respect fellow guests and staff at all times. Harassment of any kind will result in immediate eviction without refund.',
            'Guests are responsible for any damages to hostel property during their stay.',
          ],
        },
        {
          id: 'security',
          title: 'Security & Safety',
          content: [
            'Use of personal lockers is mandatory for storing valuables. The Daily Social is not responsible for lost or stolen items.',
            'CCTV cameras are installed in all common areas for guest safety (not in dorms or bathrooms).',
            '24/7 reception and security staff are available for any concerns or emergencies.',
            'Report any safety concerns immediately to the front desk.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: 'March 1, 2026',
      sections: [
        {
          id: 'info-collection',
          title: 'Information We Collect',
          content: [
            'Personal Information: Name, email, phone number, date of birth, and government ID details provided during booking.',
            'Payment Information: Credit/debit card details or payment method information (processed securely through third-party payment gateways).',
            'Usage Data: IP address, browser type, device information, and pages visited on our website.',
            'Communications: Records of emails, messages, or calls with our support team.',
          ],
        },
        {
          id: 'info-use',
          title: 'How We Use Your Information',
          content: [
            'To process bookings and provide hostel services.',
            'To communicate important updates about your reservation.',
            'To send promotional offers and newsletters (you can opt-out anytime).',
            'To improve our services and website functionality.',
            'To comply with legal obligations and prevent fraud.',
          ],
        },
        {
          id: 'data-sharing',
          title: 'Data Sharing & Security',
          content: [
            'We do not sell or rent your personal information to third parties.',
            'We may share data with trusted service providers (payment processors, booking platforms) who assist in our operations.',
            'We implement industry-standard security measures to protect your data, but no method is 100% secure.',
            'You have the right to request access, correction, or deletion of your personal data by contacting us.',
          ],
        },
        {
          id: 'cookies',
          title: 'Cookies & Tracking',
          content: [
            'Our website uses cookies to enhance user experience and analyze traffic.',
            'You can disable cookies in your browser settings, but this may affect website functionality.',
            'We use Google Analytics and similar tools to understand user behavior (anonymized data).',
          ],
        },
      ],
    },
    refund: {
      title: 'Refund Policy',
      lastUpdated: 'March 1, 2026',
      sections: [
        {
          id: 'cancellation-terms',
          title: 'Cancellation Terms',
          content: [
            'Free Cancellation: Cancel up to 7 days before check-in for a full refund.',
            'Partial Refund: Cancellations made 3-6 days before check-in will receive a 50% refund.',
            'No Refund: Cancellations within 72 hours of check-in are non-refundable.',
            'No-shows or early check-outs are not eligible for any refund.',
          ],
        },
        {
          id: 'refund-process',
          title: 'Refund Processing',
          content: [
            'Refunds will be processed within 7-10 business days of cancellation.',
            'Refunds will be credited to the original payment method used for booking.',
            'For cash bookings, refunds will be issued via bank transfer or UPI.',
            'A cancellation confirmation email will be sent once the refund is initiated.',
          ],
        },
        {
          id: 'exceptions',
          title: 'Exceptions & Special Cases',
          content: [
            'Force Majeure: In case of natural disasters, government lockdowns, or other unforeseeable events, we may offer flexible rescheduling or refunds at our discretion.',
            'Event Bookings: Special event packages (pub crawls, tours) may have different cancellation terms as specified at the time of booking.',
            'Group Bookings: Bookings for 6+ guests may require a non-refundable deposit.',
          ],
        },
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      lastUpdated: 'March 1, 2026',
      sections: [
        {
          id: 'acceptance',
          title: 'Acceptance of Terms',
          content: [
            'By making a booking at The Daily Social, you agree to these Terms & Conditions.',
            'These terms apply to all guests, visitors, and users of our services.',
            'We reserve the right to modify these terms at any time. Updates will be posted on our website.',
            'Continued use of our services after changes constitutes acceptance of the new terms.',
          ],
        },
        {
          id: 'guest-conduct',
          title: 'Guest Conduct',
          content: [
            'Guests must respect house rules, staff, and fellow travelers at all times.',
            'Illegal activities, drug use, or excessive alcohol consumption are strictly prohibited.',
            'Any form of harassment, discrimination, or violence will result in immediate eviction without refund.',
            'Guests are liable for any damages caused to hostel property or belongings of other guests.',
          ],
        },
        {
          id: 'liability',
          title: 'Limitation of Liability',
          content: [
            'The Daily Social is not responsible for loss, theft, or damage to personal belongings.',
            'Use of hostel facilities (gym, pool, common areas) is at your own risk.',
            'We are not liable for injuries, accidents, or health issues during your stay unless caused by our negligence.',
            'Travel insurance is strongly recommended for all guests.',
          ],
        },
        {
          id: 'intellectual-property',
          title: 'Intellectual Property',
          content: [
            'All content on our website (text, images, logos, branding) is owned by The Daily Social and protected by copyright.',
            'Unauthorized use, reproduction, or distribution of our content is prohibited.',
            'Guest photos taken during events may be used for marketing purposes unless you opt-out.',
          ],
        },
        {
          id: 'governing-law',
          title: 'Governing Law',
          content: [
            'These terms are governed by the laws of India.',
            'Disputes will be resolved through arbitration in Mumbai, Maharashtra.',
            'By booking with The Daily Social, you consent to the jurisdiction of Mumbai courts.',
          ],
        },
      ],
    },
  };

  const currentPolicy = type && policyContent[type] ? policyContent[type] : policyContent.guest;

  return (
    <div className="bg-[#230f14] min-h-screen">
      {/* Navigation Bar */}
      <nav className="bg-[#0f172a] border-b-2 border-[#1e293b] sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="font-['Space_Grotesk'] font-bold text-[20px] text-[#c62828] uppercase tracking-[2px]">
              The Daily Social
            </Link>
            <div className="flex gap-6">
              <Link to="/" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                Home
              </Link>
              <Link to="/rooms" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                Rooms
              </Link>
              <Link to="/events" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                Events
              </Link>
              <Link to="/about" className="font-['Space_Grotesk'] text-[14px] text-white hover:text-[#c62828] transition-colors">
                About
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Header */}
      <section className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-b-2 border-[#334155] px-6 py-12">
        <div className="max-w-screen-lg mx-auto text-center">
          <h1 className="font-['Space_Grotesk'] font-bold text-[48px] text-white tracking-[-2.4px] uppercase leading-[48px] mb-4">
            {currentPolicy.title}
          </h1>
          <p className="font-['Space_Grotesk'] text-[14px] text-[rgba(255,255,255,0.6)]">
            Last Updated: {currentPolicy.lastUpdated}
          </p>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sticky Table of Contents - Desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-[#1e293b] border-2 border-[#334155] rounded-[8px] p-6">
              <h3 className="font-['Space_Grotesk'] font-bold text-[16px] text-white uppercase tracking-[1px] mb-4">
                Table of Contents
              </h3>
              <nav className="space-y-2">
                {currentPolicy.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveSection(section.id);
                      document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-[4px] font-['Space_Grotesk'] text-[14px] transition-colors ${
                      activeSection === section.id
                        ? 'bg-[#c62828] text-white'
                        : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(198,40,40,0.1)] hover:text-white'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    <span>{section.title}</span>
                  </a>
                ))}
              </nav>

              {/* Quick Policy Links */}
              <div className="mt-8 pt-6 border-t-2 border-[#334155]">
                <h4 className="font-['Space_Grotesk'] font-bold text-[14px] text-white uppercase tracking-[1px] mb-3">
                  Other Policies
                </h4>
                <div className="space-y-2">
                  {Object.entries(policyContent).map(([key, policy]) => (
                    <Link
                      key={key}
                      to={`/policies/${key}`}
                      className={`block px-3 py-2 rounded-[4px] font-['Space_Grotesk'] text-[12px] transition-colors ${
                        type === key
                          ? 'bg-[rgba(198,40,40,0.2)] text-[#c62828]'
                          : 'text-[rgba(255,255,255,0.6)] hover:text-white'
                      }`}
                    >
                      {policy.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile TOC */}
          <div className="lg:hidden mb-8">
            <div className="bg-[#1e293b] border-2 border-[#334155] rounded-[8px] p-4">
              <select
                className="w-full bg-transparent font-['Space_Grotesk'] text-[14px] text-white border-2 border-[#334155] rounded-[4px] px-3 py-2 focus:border-[#c62828] focus:outline-none"
                onChange={(e) => {
                  const sectionId = e.target.value;
                  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <option value="">Jump to section...</option>
                {currentPolicy.sections.map((section) => (
                  <option key={section.id} value={section.id} className="bg-[#1e293b]">
                    {section.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-[#1e293b] border-2 border-[#334155] rounded-[8px] p-8 md:p-12">
              <div className="max-w-[750px] space-y-12">
                {currentPolicy.sections.map((section) => (
                  <div key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="font-['Space_Grotesk'] font-bold text-[28px] text-white uppercase leading-[34px] mb-6">
                      {section.title}
                    </h2>
                    <div className="space-y-4">
                      {section.content.map((paragraph, idx) => (
                        <p
                          key={idx}
                          className="font-['Space_Grotesk'] text-[16px] text-[rgba(255,255,255,0.9)] leading-[26px]"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Support Block */}
      <section className="px-6 py-16 bg-[rgba(255,255,255,0.05)]">
        <div className="max-w-screen-md mx-auto">
          <div className="bg-gradient-to-br from-[#c62828] to-[#8e1b1b] border-4 border-white rounded-[12px] p-8 text-center shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]" style={{ transform: 'rotate(-1deg)' }}>
            <h3 className="font-['Space_Grotesk'] font-bold text-[24px] text-white uppercase mb-3">
              Have Questions About Our Policies?
            </h3>
            <p className="font-['Liberation_Serif'] text-[16px] text-white italic mb-6">
              The Vibe Crew is here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:thedailysocial01@gmail.com"
                className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-[4px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-all"
              >
                <Mail className="w-5 h-5 text-[#c62828]" />
                <span className="font-['Space_Grotesk'] font-bold text-[14px] text-[#c62828] uppercase">
                  Email Us
                </span>
              </a>
              <a
                href="https://wa.me/918884973328"
                className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-[4px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] transition-all"
              >
                <MessageCircle className="w-5 h-5 text-[#39ff14]" />
                <span className="font-['Space_Grotesk'] font-bold text-[14px] text-[#c62828] uppercase">
                  WhatsApp
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] border-t-2 border-[#1e293b] px-6 py-8">
        <div className="max-w-screen-xl mx-auto text-center">
          <Link to="/" className="font-['Space_Grotesk'] font-bold text-[20px] text-[#c62828] uppercase tracking-[2px]">
            The Daily Social
          </Link>
          <p className="font-['Space_Grotesk'] text-[12px] text-[rgba(255,255,255,0.4)] mt-4">
            © 2026 The Daily Social. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
