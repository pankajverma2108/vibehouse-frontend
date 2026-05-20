import  { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Briefcase, GraduationCap, Users, Shield, Heart, Handshake, Clock, Smartphone, Award, ArrowRight, Map, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useLocation } from 'react-router-dom';

const Career = () => {
  const location = useLocation();

  // Effect to scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section with Background Image */}
        <section className="relative bg-hotel-primary py-20 md:py-28 overflow-hidden">
          {/* Background Image with Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{
              backgroundImage: "url('images/career-page-images/hero-image.png')",
              opacity: "0.2"
            }}
          />

          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="font-schibsted text-5xl md:text-5xl lg:text-6xl xl:text-[80px] font-medium text-white leading-tight mb-4">
                  Join the Buteak Movement
                </h1>
                <h2 className="text-2xl md:text-3xl text-white/90 font-medium mb-6">
                  Shape the Future of Living.
                </h2>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-lg border border-white/20">
                <p className="text-lg md:text-xl text-white/90 mb-4 leading-relaxed">
                  At <span className="font-bold">Buteak Suites</span>, we're redefining hospitality—one thoughtfully designed suite, one seamless stay at a time. If you're passionate about people, thrive on creativity, and believe in going beyond expectations, you might just be the next <span className="font-bold">Buteaker</span>.
                </p>
                <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                  Here, your ideas matter. Your energy matters. <span className="font-bold">You matter.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Do You Have What It Takes Section - Updated with more engaging layout */}
        <section className="py-12 md:py-16 bg-gradient-to-br from-white to-neutral-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-schibsted relative inline-block">
                Do You Have What It Takes to Be a Buteaker?
                {/* <span className="absolute -bottom-2 left-0 right-0 h-1 bg-hotel-accent transform"></span> */}
              </h2>
              <div className="w-24 h-1 bg-hotel-accent mx-auto mb-6"></div>
              {/* <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Buteak team members share these core values that define our culture and drive our success.
              </p> */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {/* Card 1 */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-hotel-accent overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-hotel-accent/20 transition-colors">
                    <Shield className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-hotel-primary group-hover:text-hotel-accent transition-colors">Integrity & Ownership</h3>
                  <p className="text-gray-600">
                    We believe in doing the right thing—especially when no one’s watching. Take initiative, own your work, and deliver with pride.
                  </p>
                </CardContent>
              </Card>

              {/* Card 2 */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-hotel-accent overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-hotel-accent/20 transition-colors">
                    <Heart className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-hotel-primary group-hover:text-hotel-accent transition-colors">Hospitality-First Mindset</h3>
                  <p className="text-gray-600">
                    Guests aren’t just guests—they’re our community. Every detail, every smile, every extra effort counts.
                  </p>
                </CardContent>
              </Card>

              {/* Card 3 */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-hotel-accent overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-hotel-accent/20 transition-colors">
                    <Handshake className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-hotel-primary group-hover:text-hotel-accent transition-colors">Team Spirit</h3>
                  <p className="text-gray-600">
                    No egos here—just teamwork. We win together, grow together, and support each other at every step.
                  </p>
                </CardContent>
              </Card>

              {/* Card 4 */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-hotel-accent overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-hotel-accent/20 transition-colors">
                    <Clock className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-hotel-primary group-hover:text-hotel-accent transition-colors">Speed with Purpose</h3>
                  <p className="text-gray-600">
                    We move fast, but with intention. In a world of constant change, we value agility, responsiveness, and thoughtful execution.
                  </p>
                </CardContent>
              </Card>

              {/* Card 5 */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-hotel-accent overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-hotel-accent/20 transition-colors">
                    <Smartphone className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-hotel-primary group-hover:text-hotel-accent transition-colors">Digital-First Thinking</h3>
                  <p className="text-gray-600">
                    From check-ins to guest feedback, we love leveraging tech to make life smoother—for both guests and team members.
                  </p>
                </CardContent>
              </Card>

              {/* Card 6 */}
              <Card className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-hotel-accent overflow-hidden">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-hotel-accent/20 transition-colors">
                    <Award className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-hotel-primary group-hover:text-hotel-accent transition-colors">Professionalism, Always</h3>
                  <p className="text-gray-600">
                    We keep our promises, show up on time, communicate clearly, and never compromise on quality.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>


        {/* Discover Who We Are Section - UPDATED with modern cards */}
        <section className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-schibsted ">
                Discover Who We Are
              </h2>
              <div className="w-24 h-1 mb-8 bg-hotel-accent mx-auto"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 - Explore the Buteak Story */}
              <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-hotel-primary/50 to-hotel-primary z-10"></div>
                <img
                  src="https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=2070"
                  alt="Buteak Story"
                  className="w-full h-80 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white z-20">
                  <h3 className="text-2xl text-white font-bold mb-2">Explore the Buteak Story</h3>
                  <p className="mb-6 text-white/90">Discover our journey from idea to hospitality leader.</p>
                  {/* <Button variant="outline" className="border-white bg-hotel-accent text-white hover:bg-white hover:text-hotel-primary w-full" asChild>
                    <Link to="/company-story" className="flex items-center justify-between">
                      <span>Read Our Story</span>
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button> */}
                </div>
              </div>

              {/* Card 2 - See Us in the News */}
              <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-hotel-accent/50 to-hotel-accent z-10"></div>
                <img
                  src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070"
                  alt="Buteak News"
                  className="w-full h-80 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white z-20">
                  <h3 className="text-2xl text-white font-bold mb-2">See Us in the News</h3>
                  <p className="mb-6 text-white/90">We don’t like to brag—but others do it for us.</p>
                  {/* <Button variant="outline" className="border-white bg-hotel-accent  bg-hotel-primary text-white hover:bg-white hover:text-hotel-accent w-full" asChild>
                    <Link to="/company-news" className="flex items-center justify-between">
                      <span>View News</span>
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button> */}
                </div>
              </div>

              {/* Card 3 - Press & Media */}
              <div className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-700/50 to-gray-900 z-10"></div>
                <img
                  src="images/career-page-images/press-and-media.png"
                  alt="Press & Media"
                  className="w-full h-80 object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white z-20">
                  <h3 className="text-2xl text-white bg-hotel-accent/10 font-bold mb-2">Press & Media</h3>
                  <p className="mb-6 text-white/90">Access resources for journalists and media professionals.</p>
                  {/* <Button variant="outline" className="border-white bg-hotel-accent text-white hover:bg-white hover:text-hotel-primary w-full" asChild>
                    <Link to="/press-media" className="flex items-center justify-between">
                      <span>Download</span>
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button> */}
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Why Work With Us Section - NEW with hexagonal layout */}
        <section className="py-12 md:py-16 bg-gradient-to-br from-hotel-primary/5 to-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 font-schibsted text-hotel-primary">
                Why Work With Us?
              </h2>
              <div className="w-24 h-1 mb-4 bg-hotel-accent mx-auto"></div>
            </div>

            <div className="flex flex-wrap pt-10 justify-center gap-6 md:gap-8">
              {/* Hexagon 1 - Updated to 22rem width and height */}
              <div className="relative w-[18rem] h-[18rem] md:w-[22rem] md:h-[22rem] group">
                <div className="absolute inset-0 bg-white shadow-lg rounded-xl transform rotate-45 group-hover:bg-hotel-accent/5 transition-colors duration-300"></div>
                <div className="absolute -top-6 inset-0 flex flex-col items-center justify-center p-2 md:p-6 text-center z-10">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-hotel-accent/20 transition-colors">
                    <GraduationCap className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-hotel-primary">Freedom to Grow</h3>
                  <p className="text-sm text-gray-600">
                    We encourage autonomy, welcome bold ideas, and support continuous learning. Your growth is our growth.
                  </p>
                </div>
              </div>

              {/* Hexagon 2 - Updated to 22rem width and height */}
              <div className="relative  w-[18rem] h-[18rem] md:w-[22rem] md:h-[22rem] group mt-12 md:mt-0">
                <div className="absolute inset-0 bg-white shadow-lg rounded-xl transform rotate-45 group-hover:bg-hotel-accent/5 transition-colors duration-300"></div>
                <div className="absolute -top-6  inset-0 flex flex-col items-center justify-center p-2 md:p-6 text-center z-10">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-hotel-accent/20 transition-colors">
                    <Users className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-hotel-primary">Feel at Home</h3>
                  <p className="text-sm text-gray-600">
                    We walk the talk—our workplace culture reflects the same comfort, warmth, and care we extend to our guests.
                  </p>
                </div>
              </div>

              {/* Hexagon 3 - Updated to 22rem width and height */}
              <div className="relative  w-[18rem] h-[18rem] md:w-[22rem] md:h-[22rem] group">
                <div className="absolute inset-0 bg-white shadow-lg rounded-xl transform rotate-45 group-hover:bg-hotel-accent/5 transition-colors duration-300"></div>
                <div className="absolute -top-6  inset-0 flex flex-col items-center justify-center p-2 md:p-6 text-center z-10">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-hotel-accent/20 transition-colors">
                    <Briefcase className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-hotel-primary">Be Part of a Movement</h3>
                  <p className="text-sm text-gray-600">
                    We're on a mission to change the way people experience travel and long-term stays. Come shape the future with us.
                  </p>
                </div>
              </div>

              {/* Hexagon 4 - Updated to 22rem width and height */}
              <div className="relative  w-[18rem] h-[18rem] md:w-[22rem] md:h-[22rem] group mt-12 md:mt-0">
                <div className="absolute inset-0 bg-white shadow-lg rounded-xl transform rotate-45 group-hover:bg-hotel-accent/5 transition-colors duration-300"></div>
                <div className="absolute -top-6  inset-0 flex flex-col items-center justify-center p-2 md:p-6 text-center z-10">
                  <div className="w-16 h-16 bg-hotel-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-hotel-accent/20 transition-colors">
                    <Map className="text-hotel-accent h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-hotel-primary">Opportunities Across India</h3>
                  <p className="text-sm text-gray-600">
                    With expansion plans underway, there's never been a better time to hop on board.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Partnership CTA Section - NEW with parallax effect */}
        {/* <section className="pb-12 pt-20 md:pb-16 bg-gray-50 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="relative">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-hotel-accent/5 rounded-full blur-xl"></div>
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-hotel-primary/5 rounded-full blur-xl"></div>

                <div className="relative bg-white rounded-xl shadow-xl overflow-hidden z-10">
                  <div className="md:flex">
                    <div className="md:w-1/2 relative h-64 md:h-auto">
                      <div className="absolute inset-0">
                        <img
                          src="images/career-page-images/own-a-property.png"
                          alt="Property Partnership"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-hotel-primary/70 to-transparent flex items-center justify-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white  mb-4 md:hidden">Own a Property?</h2>
                      </div>
                    </div>
                    <div className="p-8 md:p-12 md:w-1/2">
                      <h3 className="text-3xl font-bold mb-6 hidden md:block text-hotel-primary">Own a Property? <br />Let's Partner.</h3>
                      <p className="text-hotel-body mb-8">
                        We’re growing and always open to collaboration.
                      </p>

                      <div className="flex items-center space-x-4 mb-4 bg-hotel-accent/5 p-3 rounded-lg hover:bg-hotel-accent/10 transition-colors">
                        <div className="bg-hotel-accent/20 p-3 rounded-full">
                          <Home className="text-hotel-accent h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium text-hotel-primary">Higher Returns</p>
                          <p className="text-sm text-gray-600">Than traditional rental models</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 bg-hotel-accent/5 p-3 rounded-lg hover:bg-hotel-accent/10 transition-colors">
                        <div className="bg-hotel-accent/20 p-3 rounded-full">
                          <Map className="text-hotel-accent h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-medium text-hotel-primary">Expert Management</p>
                          <p className="text-sm text-gray-600">End-to-end property handling</p>
                        </div>
                      </div>

                      <Button className="mt-8 bg-hotel-primary rounded-[23px] hover:bg-hotel-accent text-white py-6 px-8  transition-colors font-medium text-lg shadow-lg hover:shadow-xl">
                        Learn About Partnerships
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section> */}

        {/* Contact CTA */}
        <section className="py-12 md:py-16 mt-12 bg-hotel-primary/10">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-schibsted">Don't See the Right Fit?</h2>
              <p className="text-lg mb-8">
                We're always looking for talented individuals to join our team. Send your resume to careers@buteaksuites.com and tell us how you can contribute.
              </p>
              <Button
                className="bg-hotel-primary rounded-[23px] hover:bg-hotel-accent text-white py-6 px-8 transition-colors font-medium text-lg"
              >
                Contact Us
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Career;
