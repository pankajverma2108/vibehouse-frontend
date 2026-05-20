
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import WhatsAppChat from './WhatsAppChat';
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll position to apply background styles
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);







  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const phoneNumber = '+91 9993177238';
  const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

  const handleWhatsAppClick = () => {
    window.open(`https://live.ipms247.com/booking/book-rooms-buteaksuites-lf`, '_blank');
  };
  return (
    <>
      <nav

        // className={`transition-all duration-300 py-4 fixed top-0 left-0 right-0 z-50 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
        //   }`}
        className="bg-white py-2 md:py-4 shadow-sm sticky header_bottom_border top-0 z-50"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex justify-between items-center">
              <div className="flex items-center nav_web_view">
                <Link to="/"
                  // className={`transition-colors hover:text-hotel-accent ${isScrolled ? 'text-hotel-body' : 'text-white'
                  //   } ${isActive('/') ? (isScrolled ? 'text-hotel-accent' : 'text-hotel-accent') : ''}`}
                  className="flex items-center"
                >
                  <img src="/images/logo.svg" alt="Logo" />

                  {/* <span className="font-schibsted text-hotel-primary text-2xl font-bold">Buteak Suites</span> */}
                </Link>
              </div>
              <div className="flex items-center nav_mobile_view">
                <Link to="/" className="flex items-center">
                  <img src="/images/logo.svg" alt="Logo" />

                  {/* <span className="font-schibsted text-hotel-primary text-2xl font-bold">Buteak Suites</span> */}
                </Link>
              </div>
            </div>
            {/* Desktop Navigation - Centered */}
            <div className="hidden md:flex flex-1 justify-center">
              <div className="flex items-center space-x-8">
                <Link
                  to="/"

                  // className={`transition-colors hover:text-hotel-accent ${isScrolled ? 'text-hotel-body' : 'text-white'
                  //   } ${isActive('/') ? (isScrolled ? 'text-hotel-accent' : 'text-hotel-accent') : ''}`}
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/') ? 'text-hotel-accent font-bold `border-b-2` border-hotel-accent' : ''}`}
                >
                  Home
                </Link>
                {/* <Link
                  to="/rooms"
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/rooms') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}
                >
                  Rooms
                </Link> */}
                {/* <Link
                  to="/hotels"
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/rooms') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}

                >
                  Hotels
                </Link> */}
                {/* <Link
                  to="/loyalty-program"

                  // className={`transition-colors hover:text-hotel-accent ${isScrolled ? 'text-hotel-body' : 'text-white'
                  //   } ${isActive('/loyalty-program') ? (isScrolled ? 'text-hotel-accent' : 'text-hotel-accent') : ''}`}
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/loyalty-program') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}
                >
                  Loyalty Program
                </Link> */}
                <Link
                  to="/developers"

                  // className={`transition-colors hover:text-hotel-accent ${isScrolled ? 'text-hotel-body' : 'text-white'
                  //   } ${isActive('/developers') ? (isScrolled ? 'text-hotel-accent' : 'text-hotel-accent') : ''}`}
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/developers') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}
                >
                  Developers and Owners
                </Link>
                <Link
                  to="/career"

                  // className={`transition-colors hover:text-hotel-accent ${isScrolled ? 'text-hotel-body' : 'text-white'
                  //   } ${isActive('/career') ? (isScrolled ? 'text-hotel-accent' : 'text-hotel-accent') : ''}`}
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/career') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}
                >
                  Career
                </Link>
                {/* <Link
                  to="/gallery"
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/gallery') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}
                >
                  Gallery
                </Link> */}
                <Link
                  to="/about"


                  // className={`transition-colors hover:text-hotel-accent ${isScrolled ? 'text-hotel-body' : 'text-white'
                  //   } ${isActive('/about') ? (isScrolled ? 'text-hotel-accent' : 'text-hotel-accent') : ''}`}
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/about') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}
                >
                  About Us
                </Link>
                <Link
                  to="/contact"

                  // className={`transition-colors hover:text-hotel-accent ${isScrolled ? 'text-hotel-body' : 'text-white'
                  //   } ${isActive('/contact') ? (isScrolled ? 'text-hotel-accent' : 'text-hotel-accent') : ''}`}
                  className={`text-hotel-body hover:text-hotel-accent transition-colors ${isActive('/contact') ? 'text-hotel-accent font-medium border-b-2 border-hotel-accent' : ''}`}
                >
                  Contact
                </Link>
              </div>
            </div>

            {/* Book Now Button */}
            <Button onClick={handleWhatsAppClick} asChild
              // className={`rounded-full hidden md:block ${isScrolled ? 'hotel-button' : 'bg-[#D4A437] text-black hover:bg-[#D4A437]/90'}`}
              className="hotel-button text-lg hidden md:flex"
            >
              <Link to="/">Book Now</Link>
            </Button>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button onClick={toggleMenu} className="text-hotel-primary">
                {isMenuOpen ? <X size={30} /> : <Menu size={30} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white px-4 top-0 z-[-1] py-5 shadow-lg animate-fade-in fixed w-full z-50">
            <div className="flex flex-col mt-16 space-y-4">
              <Link
                to="/"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Home
              </Link>
              {/* <Link
                to="/rooms"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/rooms') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Rooms
              </Link> */}
              {/* <Link
                to="/hotels"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/hotels') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Hotels
              </Link> */}
              <Link
                to="/loyalty-program"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/loyalty-program') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Loyalty Program
              </Link>
              <Link
                to="/developers"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/developers') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Developers and Owners
              </Link>
              <Link
                to="/career"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/career') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Career
              </Link>
              {/* <Link
                to="/gallery"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/gallery') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Gallery
              </Link> */}
              <Link
                to="/about"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/about') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                About Us
              </Link>
              <Link
                to="/contact"
                className={`text-hotel-body hover:text-hotel-accent transition-colors px-4 py-2 ${isActive('/contact') ? 'text-hotel-accent font-medium border-l-4 border-hotel-accent pl-3' : ''}`}
              >
                Contact
              </Link>
              <Button onClick={handleWhatsAppClick} asChild className="hotel-button text-lg  w-full">
                Book Now
              </Button>
            </div>
          </div>
        )}
      </nav>
      <WhatsAppChat />
    </>
  );
};

export default Navbar;
