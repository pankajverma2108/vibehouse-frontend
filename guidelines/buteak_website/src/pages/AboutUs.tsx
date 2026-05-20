
// Removed unused React import as it's not required in modern React versions
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Building, Users, ArrowRight, Map, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WelcomeSection from '@/components/WelcomeSection';

const AboutUs = () => {

  const phoneNumber = '919993177238';
  const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 md:py-20 bg-hotel-primary text-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-schibsted text-5xl md:text-5xl lg:text-6xl xl:text-[80px] font-medium text-white leading-tight mb-4">About Buteak Suites</h1>
            <p className="text-lg text-white md:text-xl opacity-90">
              Welcome to Buteak Suites, where we redefine the way you experience hospitality. Our premium serviced apartments offer the perfect blend of comfort, luxury, and affordability, giving you the feel of a 5-star hotel with the spaciousness and privacy of your own home. Whether you're traveling for business or leisure, Buteak is your ideal choice for a luxurious stay that doesn't break the bank.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Basic Concept</h2>
              <div className="w-24 h-1 bg-hotel-accent mt-4 mb-6"></div>
              <p className="text-hotel-body mb-6">
                At Buteak Suites, we offer premium luxury apartments that provide a higher level of service and comfort compared to traditional accommodations.
              </p>
              <p className="text-hotel-body mb-6">
                Our spacious apartments feature 5-star hotel amenities and services, all at lower prices than you would typically find at luxury hotels.
              </p>
              <p className="text-hotel-body">
                Perfect for short or long Suites, our serviced apartments offer a home-like environment with all the luxuries you deserve.
              </p>
            </div>
            <div className="relative">
              <img
                src="images/about-us-in-basic-concept.png"
                alt="Hotel Building"
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Buteak Suites </h2>
            <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="h-16 w-16 rounded-full bg-hotel-accent/10 flex items-center justify-center mx-auto mb-6">
                <Building className="h-8 w-8 text-hotel-accent" />
              </div>
              <h3 className="text-xl font-bold mb-4">Spacious Apartments</h3>
              <p className="text-hotel-body">
                Enjoy the comfort of large, beautifully designed apartments that give you the freedom to live and work comfortably.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="h-16 w-16 rounded-full bg-hotel-accent/10 flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-hotel-accent" />
              </div>
              <h3 className="text-xl font-bold mb-4">Luxurious Amenities</h3>
              <p className="text-hotel-body">
                From plush bedding and fully-equipped kitchens to high-end bathroom facilities, we ensure you have everything you need.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="h-16 w-16 rounded-full bg-hotel-accent/10 flex items-center justify-center mx-auto mb-6">
                <Building className="h-8 w-8 text-hotel-accent" />
              </div>
              <h3 className="text-xl font-bold mb-4">Personalized Services</h3>
              <p className="text-hotel-body">
                Our dedicated team is here to offer you the best experience possible, ensuring that your needs are met at every step.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <div className="h-16 w-16 rounded-full bg-hotel-accent/10 flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-hotel-accent" />
              </div>
              <h3 className="text-xl font-bold mb-4">5-Star Hotel Amenities</h3>
              <p className="text-hotel-body">
                Experience the finest services, including housekeeping, concierge, high-speed Wi-Fi, and more, all included in your stay.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Why Work With Us Section - NEW */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-white to-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Work With Us?</h2>
            <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
            <p className="text-hotel-body text-lg mb-8">
              Join our dynamic team and be part of a hospitality revolution that's changing how people experience travel and accommodations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-hotel-accent">
              <h3 className="text-xl font-bold mb-4 text-hotel-primary">Freedom to Grow</h3>
              <p className="text-hotel-body">
                We believe in empowering our team members with the autonomy to make decisions and the support to develop their careers.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-hotel-accent">
              <h3 className="text-xl font-bold mb-4 text-hotel-primary">Feel at Home</h3>
              <p className="text-hotel-body">
                Our workspace culture is designed to make you feel comfortable, valued, and part of a close-knit family.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-hotel-accent">
              <h3 className="text-xl font-bold mb-4 text-hotel-primary">Be Part of a Movement</h3>
              <p className="text-hotel-body">
                We're not just running hotels; we're creating a new standard in hospitality that combines luxury, comfort, and accessibility.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border-t-4 border-hotel-accent">
              <h3 className="text-xl font-bold mb-4 text-hotel-primary">Opportunities Across India</h3>
              <p className="text-hotel-body">
                With our expanding presence throughout India, there are countless opportunities for growth and relocation within our network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Discover Who We Are Section - NEW */}
      <section className="py-12 md:py-20 bg-hotel-primary/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Discover Who We Are</h2>
            <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-hotel-primary">Explore the Buteak Story</h3>
                <ArrowRight className="h-5 w-5 text-hotel-accent" />
              </div>
              <p className="text-hotel-body mb-6">
                Learn about our journey from a simple idea to becoming a leading hospitality innovator in India.
              </p>
              {/* <Button variant="outline" className="w-full border-hotel-accent text-hotel-accent hover:bg-hotel-accent hover:text-white">
                Our Story
              </Button> */}
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-hotel-primary">See Us in the News</h3>
                <ArrowRight className="h-5 w-5 text-hotel-accent" />
              </div>
              <p className="text-hotel-body mb-6">
                Discover how Buteak Suites is making headlines for revolutionizing the hospitality industry in India.
              </p>
              {/* <Button variant="outline" className="w-full border-hotel-accent text-hotel-accent hover:bg-hotel-accent hover:text-white">
                News Coverage
              </Button> */}
            </div>

            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-hotel-primary">Press & Media</h3>
                <ArrowRight className="h-5 w-5 text-hotel-accent" />
              </div>
              <p className="text-hotel-body mb-6">
                Access press releases, media kits, and company information for journalists and media professionals.
              </p>
              {/* <Button variant="outline" className="w-full border-hotel-accent text-hotel-accent hover:bg-hotel-accent hover:text-white">
                Media Resources
              </Button> */}
            </div>
          </div>
        </div>
      </section>

      {/* Partnership CTA Section - NEW */}
      <section className="py-12 md:py-20 bg-hotel-primary/10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 relative">
                <img
                  src="images/career-page-images/own-a-property.png"
                  alt="Property Partnership"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-hotel-primary/70 to-transparent flex items-center justify-center md:hidden">
                  {/* <h3 className="text-3xl font-bold text-white px-6">Own a Property?</h3> */}
                </div>
              </div>
              <div className="p-8 md:w-1/2 flex flex-col justify-center">
                <h3 className="text-3xl font-bold mb-6 ">Own a Property? <br />Let's Partner.</h3>
                <p className="text-hotel-body mb-8">
                  Turn your property into a revenue-generating asset with Buteak Suites. We offer flexible partnership models for property owners looking to maximize returns while minimizing hassle.
                </p>
                <div className="flex items-center space-x-4">
                  <div className="bg-hotel-accent/10 p-3 rounded-full">
                    <Home className="text-hotel-accent h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">Higher Returns</p>
                    <p className="text-sm text-gray-600">Than traditional rental models</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 my-4">
                  <div className="bg-hotel-accent/10 p-3 rounded-full">
                    <Map className="text-hotel-accent h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">Expert Management</p>
                    <p className="text-sm text-gray-600">End-to-end property handling</p>
                  </div>
                </div>
                <Button onClick={handleWhatsAppClick} className="mt-6 bg-hotel-primary hover:bg-hotel-accent text-white">
                  Learn About Partnerships
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Partners</h2>
            <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-6"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2  align-self-center  justify-self-center lg:grid-cols-3 md:gap-16 gap-8">

            {/* Team Member 1 */}
            <div className="text-center">
              <div className="overflow-hidden partners_images mx-auto mb-4">
                <img
                  src="/images/partners/my-gate.png"
                  alt="MyGate"
                  className="object-cover"
                />
              </div>
            </div>
            {/* Team Member 2 */}
            <div className="text-center">
              <div className=" overflow-hidden partners_images mx-auto mb-4">
                <img
                  src="/images/partners/cultfit.png"
                  alt="Cult.fit"
                  className=" object-cover"
                />
              </div>
            </div>

            {/* Team Member 3 */}
            <div className="text-center">
              <div className=" overflow-hidden partners_images mx-auto mb-4">
                <img
                  src="/images/partners/built-91.png"
                  alt="Build91"
                  className=" object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
