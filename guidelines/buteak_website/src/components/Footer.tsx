
// import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";

const Footer = () => {
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Subscribed!",
      description: "Thank you for subscribing to our newsletter.",
      duration: 3000,
    });
  };

  return (
    <footer id="contact" className="bg-hotel-primary text-white py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Hotel Info */}
          <div>
            <img src="/images/footer-buteak-logo.svg" alt="Buteak Suites Logo" className="mb-4 h-20 w-20" />
            {/* <h3 className="font-schibsted text-2xl text-hotel-accent font-bold mb-4 text-hotel-accent">Buteak Suites</h3> */}
            <p className="mb-4 text-[#d7d7d7]">Experience luxury redefined in the heart of the city, where every detail is crafted for your comfort.</p>
            {/* <div className="flex space-x-4">
              <Link to="#" className="text-[#d7d7d7] hover:text-hotel-accent transition-colors" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </Link>
              <Link to="#" className="text-[#d7d7d7] hover:text-hotel-accent transition-colors" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
              </Link>
              <Link to="#" className="text-[#d7d7d7] hover:text-hotel-accent transition-colors" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </Link>
            </div> */}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-schibsted text-white text-xl font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-[#d7d7d7]">
              <li><Link to="/" className="hover:text-hotel-accent transition-colors">Home</Link></li>
              <li><Link to="/hotels" className="hover:text-hotel-accent transition-colors">Rooms & Suites</Link></li>
              <li><Link to="/amenities" className="hover:text-hotel-accent transition-colors">Amenities</Link></li>
              <li><Link to="/developers" className="hover:text-hotel-accent transition-colors">Developers and Owners</Link></li>
              {/* <li><Link to="/loyalty-program" className="hover:text-hotel-accent transition-colors">Loyalty Program</Link></li> */}
              {/* <li><Link to="/book-now" className="hover:text-hotel-accent transition-colors">Book Now</Link></li> */}
              <li><Link to="/contact" className="hover:text-hotel-accent transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Services Links */}
          {/* <div>
            <h4 className="font-schibsted text-white text-xl font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li><Link to="/spa" className="hover:text-hotel-accent transition-colors">Spa & Wellness</Link></li>
              <li><Link to="/dining" className="hover:text-hotel-accent transition-colors">Fine Dining</Link></li>
              <li><Link to="/conferences" className="hover:text-hotel-accent transition-colors">Conference Facilities</Link></li>
              <li><Link to="/weddings" className="hover:text-hotel-accent transition-colors">Wedding Venues</Link></li>
              <li><Link to="/transfers" className="hover:text-hotel-accent transition-colors">Airport Transfers</Link></li>
              <li><Link to="/concierge" className="hover:text-hotel-accent transition-colors">Concierge Services</Link></li>
            </ul>
          </div> */}

          {/* Contact */}
          <div>
            <h4 className="font-schibsted text-white  text-xl font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-[#d7d7d7]">
              {/* <li className="flex items-start">
                <MapPin size={32} className="mr-2 text-hotel-accent mt-1" />
                <span>13/14,Rashtrakavi Kuvempu Nagar,Bengaluru Urban, Karnataka,560076</span>
              </li> */}
              <li className="flex items-start">
  <MapPin size={32} className="mr-2 text-hotel-accent mt-1" />
  <a
    href="https://maps.app.goo.gl/iWpmJKyfJ6QC29tw7?g_st=aw"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-hotel-accent transition-colors"
  >
    13/14, 1st B Main Rd, Mico Layout, BTM 2nd Stage, BTM Layout, Bengaluru, Karnataka 560076
  </a>
</li>
              <li className="flex items-center">
                <Phone size={20} className="mr-2 text-hotel-accent" />
                <span>+91 9993177238</span>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-2 text-hotel-accent" />
                <span>contact@buteak.in</span>
              </li>
            </ul>

            {/* Newsletter Form */}
            {/* <div className="mt-6">
              <h5 className="text-lg text-white font-semibold mb-3">Newsletter</h5>
              <form className="space-y-3" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="Your Email Address"
                  className="w-full px-4 py-2 rounded-md bg-white/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-hotel-accent text-white placeholder:text-white/50"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-hotel-accent text-white py-2 rounded-md hover:bg-opacity-90 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div> */}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <p className="text-center text-white md:text-left text-sm">
              &copy; {new Date().getFullYear()} Buteak Suites. All rights reserved.
            </p>
            <div className="flex justify-center md:justify-end space-x-4 text-sm">
              <Link to="/privacy-policy" className="hover:text-hotel-accent transition-colors">Privacy Policy</Link>
              <Separator orientation="vertical" className="h-4 bg-white/30" />
              <Link to="/terms-and-conditions" className="hover:text-hotel-accent transition-colors">Terms & Conditions</Link>
              {/* <Separator orientation="vertical" className="h-4 bg-white/30" /> */}
              {/* <Link to="/sitemap" className="hover:text-hotel-accent transition-colors">Sitemap</Link> */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
