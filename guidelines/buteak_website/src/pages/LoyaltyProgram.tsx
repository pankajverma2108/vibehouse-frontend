import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Award, Star, Ticket, Badge, Compass, Rocket, BadgePercent, StarHalf, WalletCards } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";

const LoyaltyProgram = () => {
  const phoneNumber = '919993177238';
  const message = encodeURIComponent('Hello! I would like to know more about Buteak Suites.');

  const handleWhatsAppClick = () => {
    window.open(`https://live.ipms247.com/booking/book-rooms-buteaksuites-lf`, '_blank');
  };
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-white to-hotel-light">
        {/* Hero Section */}
        <div className="relative bg-hotel-primary text-white py-24">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-hotel-primary to-hotel-primary/80"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-center"
              >
                <div className="mb-8 flex justify-center">
                  <div className="bg-hotel-accent/20 p-4 rounded-full">
                    <Award className="text-hotel-accent" size={56} />
                  </div>
                </div>

                <h1 className="text-5xl text-hotel-accent md:text-5xl lg:text-6xl xl:text-[80px] font-schibsted font-medium mb-4">
                  {/* font-schibsted text-5xl md:text-5xl lg:text-6xl xl:text-[80px]  text-white leading-tight mb-4 */}
                  The Buteak Loyalty Program
                </h1>

                <p className="text-xl font-schibsted md:text-2xl mb-8 text-white/90">
                  The More You Stay, The More You Save
                </p>

                <div className="flex flex-wrap justify-center gap-5 mt-8">
                  <motion.div
                    onClick={handleWhatsAppClick}
                    whileHover={{ scale: 1.05 }}
                    className="bg-white text-hotel-primary px-8 py-2 rounded-[23px] font-bold hover:bg-hotel-accent hover:text-white transition duration-300"
                  >
                    Join Now
                  </motion.div>

                  {/* <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-md font-bold hover:bg-white/10 transition duration-300"
                  >
                    Learn More
                  </motion.div> */}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full overflow-hidden">
            <svg className="relative block w-full h-16 text-hotel-light" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.11,140.83,94.17,201.89,82.11Z" className="fill-current"></path>
            </svg>
          </div>
        </div>

        {/* New "Introducing: Stay & Save" Section */}
        <div className="py-12 md:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16 max-w-7xl mx-auto">
              {/* Left Side: Text Content */}
              <motion.div
                className="w-full lg:w-1/2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="mb-4 inline-block">
                  <div className="flex items-center gap-2 bg-hotel-accent/10 text-hotel-accent px-4 py-2 rounded-full">
                    <BadgePercent size={18} />
                    <span className="text-sm font-medium">Exclusive Member Benefits</span>
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-schibsted font-bold mb-4 text-hotel-primary">
                  Introducing: <span className="text-hotel-accent">Stay & Save—</span>
                </h2>

                <div className="w-24 h-1 bg-hotel-accent mt-4 mb-6"></div>

                <p className="text-lg mb-8 leading-relaxed text-gray-700">
                  our exclusive loyalty program crafted for guests who
                  feel right at home with Buteak Suites. Whether you're here for business or leisure,
                  your commitment deserves to be rewarded. The longer your journey with us, the
                  better the perks.
                </p>

                <div className="flex flex-wrap gap-4 items-center">
                  <Button onClick={handleWhatsAppClick} className="bg-hotel-primary hover:bg-hotel-primary/90 text-white px-8">
                    Join Now
                  </Button>

                  {/* <div className="flex items-center gap-2 text-hotel-primary">
                    <StarHalf size={20} className="text-hotel-accent" />
                    <span>Already a member? Sign in</span>
                  </div> */}
                </div>
              </motion.div>

              {/* Right Side: Image or Illustration */}
              <motion.div
                className="w-full lg:w-1/2"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="relative">
                  <div className="absolute -top-6 -left-6 w-full h-full border-2 border-hotel-accent rounded-xl"></div>
                  <div className="relative z-10 overflow-hidden rounded-xl shadow-2xl">
                    <AspectRatio ratio={4 / 3} className="bg-gray-100">
                      <img
                        src="images/loyalty/buteak-suites-loyalty-card.png"
                        alt="Buteak Suites Loyalty Card"
                        className="object-cover w-full h-full"
                      />
                    </AspectRatio>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                        <div className="flex items-center gap-3">
                          <WalletCards className="text-hotel-accent" size={28} />
                          <div>
                            <p className="text-xs font-semibold text-hotel-primary">BUTEAK MEMBERSHIP</p>
                            <p className="text-lg font-bold text-hotel-accent">Stay more, save more</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* New "Stay & Save Tiers" Section */}
        {/* <div className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-schibsted font-bold mb-6">Stay & Save Tiers</h2>
                <div className="w-24 h-1 bg-hotel-accent mx-auto mb-6"></div>
                <p className="text-lg max-w-3xl mx-auto">
                  Our tiered loyalty program rewards you based on your stays. The more you stay, the more benefits you unlock.
                </p>
              </motion.div>
            </div>

            Tier Cards - Horizontal Layout
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                Silver Tier
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 opacity-30 group-hover:opacity-100 transition-all duration-700"></div>
                  <div className="relative bg-white p-6 rounded-lg shadow-lg border-t-4 border-gray-300 h-full flex flex-col">
                    <div className="mb-6 flex justify-between items-center">
                      <div className="p-3 rounded-full bg-gray-100">
                        <Star className="text-gray-500" size={28} />
                      </div>
                      <UIBadge variant="outline" className="bg-gray-100 text-gray-700">
                        1-4 Stays
                      </UIBadge>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-700 mb-2">Silver</h3>
                    <p className="text-gray-600 mb-6">Begin your journey with our entry-level tier.</p>

                    <div className="flex-grow space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        <p>5% off room rates</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        <p>Early check-in when available</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        <p>Free Wi-Fi</p>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 mt-auto">
                      Learn More
                    </Button>
                  </div>
                </motion.div>

                Gold Tier
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 opacity-30 group-hover:opacity-100 transition-all duration-700"></div>
                  <div className="relative bg-white p-6 rounded-lg shadow-lg border-t-4 border-amber-400 h-full flex flex-col">
                    <div className="mb-6 flex justify-between items-center">
                      <div className="p-3 rounded-full bg-amber-50">
                        <Star className="text-amber-500" size={28} />
                      </div>
                      <UIBadge variant="outline" className="bg-amber-50 text-amber-700">
                        5-9 Stays
                      </UIBadge>
                    </div>

                    <h3 className="text-2xl font-bold text-amber-800 mb-2">Gold</h3>
                    <p className="text-gray-600 mb-6">Enhanced benefits for our regular guests.</p>

                    <div className="flex-grow space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                        <p>10% off room rates</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                        <p>Guaranteed early check-in</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                        <p>Late check-out (until 2pm)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                        <p>Welcome drink upon arrival</p>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full border-amber-400 text-amber-700 hover:bg-amber-50 mt-auto">
                      Learn More
                    </Button>
                  </div>
                </motion.div>

                Platinum Tier
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-hotel-accent/30 via-hotel-accent to-hotel-accent/30 opacity-30 group-hover:opacity-100 transition-all duration-700"></div>
                  <div className="relative bg-white p-6 rounded-lg shadow-lg border-t-4 border-hotel-accent h-full flex flex-col">
                    <div className="absolute -top-4 -right-4 bg-hotel-accent text-white text-xs px-3 py-1 rounded-full">
                      Premium
                    </div>
                    <div className="mb-6 flex justify-between items-center">
                      <div className="p-3 rounded-full bg-hotel-accent/10">
                        <Award className="text-hotel-accent" size={28} />
                      </div>
                      <UIBadge variant="outline" className="bg-hotel-accent/10 text-hotel-accent">
                        10+ Stays
                      </UIBadge>
                    </div>

                    <h3 className="text-2xl font-bold text-hotel-primary mb-2">Platinum</h3>
                    <p className="text-gray-600 mb-6">Our most exclusive benefits for loyal guests.</p>

                    <div className="flex-grow space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-hotel-accent"></div>
                        <p>15% off room rates</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-hotel-accent"></div>
                        <p>Guaranteed room upgrade</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-hotel-accent"></div>
                        <p>Late check-out (until 4pm)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-hotel-accent"></div>
                        <p>Complimentary breakfast</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-hotel-accent"></div>
                        <p>Exclusive lounge access</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-hotel-accent"></div>
                        <p>Personal concierge service</p>
                      </div>
                    </div>

                    <Button className="w-full bg-hotel-accent text-white hover:bg-hotel-accent/90 mt-auto">
                      Learn More
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div> */}


        {/* Redesigned Become Loyalty Member Section */}
        <div className="pt-12 md:pt-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 font-schibsted">Become a Loyalty Member</h2>
                <div className="w-24 h-1 bg-hotel-accent mx-auto  mb-6"></div>
                <p className="text-lg max-w-3xl mx-auto">Our exclusive loyalty program crafted for guests who feel right at home with Buteak Suites. Whether you're here for business or leisure, your commitment deserves to be rewarded. The longer your journey with us, the better the perks.</p>
              </motion.div>
            </div>

            {/* Redesigned Membership Levels Layout with Images */}

            <div className="max-w-7xl pt-16 mx-auto">
              <h2 className="text-3xl text-center md:text-4xl font-schibsted font-bold mb-4">Stay & Save Tiers</h2>
              <div className="w-24 h-1 bg-hotel-accent mx-auto mt-4 mb-8"></div>
              {/* Tier 1: Explorer */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="flex flex-col md:flex-row items-center mb-20 gap-8"
              >
                {/* Image Column */}
                <div className="w-full md:w-1/2 rounded-xl overflow-hidden shadow-lg">
                  <AspectRatio ratio={16 / 9} className="bg-blue-50">
                    <img
                      src="images/loyalty/explorer-membership-level.png"
                      alt="Explorer membership level"
                      className="object-cover w-full h-full rounded-xl"
                    />
                  </AspectRatio>
                </div>

                {/* Content Column */}
                <div className="w-full md:w-1/2 p-6 md:p-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-t-4 border-blue-200 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    {/* <div className="p-3 rounded-lg bg-white shadow-sm">
                      <Compass className="text-blue-500" size={36} />
                    </div> */}
                    <h3 className="text-3xl font-bold text-hotel-primary">Explorer</h3>
                    <UIBadge className="bg-blue-100 text-sm text-blue-700 ml-auto"> Level 1</UIBadge>
                  </div>

                  {/* <div className="mb-4">
                    <span className="inline-block text-sm font-medium text-blue-600">0+ Points</span>
                  </div> */}

                  <p className="mb-6 text-gray-700">Thank you for choosing Buteak Suites! As you begin your journey with us, here’s a little something to show our appreciation.</p>
                  <p className="mb-6 text-gray-700">Welcome, Explorer! You’re now eligible for a 5% discount after your first stay with us.</p>
                  <div className="mb-8">
                    {/* <h4 className="font-bold mb-4 text-gray-800">Member Benefits</h4> */}
                    <ul className="space-y-3 mb-6">
                      {["Eligibility: 1–3 stays Loyalty", "Discount: 5%"].map((benefit, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: 0.1 + i * 0.1 }}
                          viewport={{ once: true }}
                        >
                          <Star className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                          <span>{benefit}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* <Button 
                      className="w-full border-2 border-blue-500 text-blue-700 hover:bg-blue-500 hover:text-white transition duration-300 font-semibold"
                      variant="outline"
                    >
                      Join Explorer
                    </Button> */}
                  </div>
                </div>
              </motion.div>

              {/* Tier 2: Voyager - Reverse layout */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="flex flex-col md:flex-row-reverse items-center mb-20 gap-8"
              >
                {/* Image Column */}
                <div className="w-full md:w-1/2 rounded-xl overflow-hidden shadow-lg relative">
                  <div className="absolute top-4 right-4 z-10">
                  </div>
                  <AspectRatio ratio={16 / 9} className="bg-purple-50">
                    <img
                      src="images/loyalty/voyager-membership-level.png"
                      alt="Voyager membership level"
                      className="object-cover w-full h-full rounded-xl"
                    />
                  </AspectRatio>
                </div>

                {/* Content Column */}
                <div className="w-full md:w-1/2 p-6 md:p-10 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-t-4 border-purple-200 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    {/* <div className="p-3 rounded-lg bg-white shadow-sm">
                      <Rocket className="text-purple-500" size={36} />
                    </div> */}
                    <h3 className="text-3xl font-bold text-hotel-primary">Voyager</h3>
                    <UIBadge className="bg-purple-100 text-purple-700 px-3 py-1.5 text-sm ml-auto">Level 2</UIBadge>

                  </div>

                  {/* <div className="mb-4">
                    <span className="inline-block text-sm font-medium text-purple-600">25,000+ Points</span>
                  </div> */}

                  <p className="mb-6 text-gray-700">You’ve made Buteak Suites your go-to getaway—and we love it! Your continued loyalty means the world to us.</p>
                  <p className="mb-6 text-gray-700">As a Voyager, you now enjoy a 10% discount on every booking moving forward.</p>
                  <div className="mb-8">
                    {/* <h4 className="font-bold mb-4 text-gray-800">Member Benefits</h4> */}
                    <ul className="space-y-3 mb-6">
                      {["Eligibility: 4–9 stays", "Loyalty Discount: 10%"].map((benefit, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: 0.1 + i * 0.1 }}
                          viewport={{ once: true }}
                        >
                          <Star className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-purple-500" />
                          <span>{benefit}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* <Button 
                      className="w-full border-2 border-purple-500 text-purple-700 hover:bg-purple-500 hover:text-white transition duration-300 font-semibold"
                      variant="outline"
                    >
                      Join Voyager
                    </Button> */}
                  </div>
                </div>
              </motion.div>

              {/* Tier 3: Trailblazer */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="flex flex-col md:flex-row items-center mb-12 gap-8"
              >
                {/* Image Column */}
                <div className="w-full md:w-1/2 rounded-xl overflow-hidden shadow-lg">
                  <AspectRatio ratio={16 / 9} className="bg-amber-50">
                    <img
                      src="images/loyalty/trailblazer-membership-level.png"
                      alt="Trailblazer membership level"
                      className="object-cover w-full h-full rounded-xl"
                    />
                  </AspectRatio>
                </div>

                {/* Content Column */}
                <div className="w-full md:w-1/2 p-6 md:p-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border-t-4 border-amber-200 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    {/* <div className="p-3 rounded-lg bg-white shadow-sm">
                      <Award className="text-hotel-accent" size={36} />
                    </div> */}
                    <h3 className="text-3xl font-bold text-hotel-primary">Trailblazer</h3>
                    <UIBadge className="bg-amber-100 text-amber-700 text-sm ml-auto">Level 3</UIBadge>
                  </div>

                  {/* <div className="mb-4">
                    <span className="inline-block text-sm font-medium text-amber-600">50,000+ Points</span>
                  </div> */}

                  <p className="mb-6 text-gray-700">You’re not just a guest—you’re family. Thank you for making Buteak Suites part of your lifestyle. We’re honored to host you, wherever your journey takes you.</p>
                  <p className="mb-6 text-gray-700">As a Trailblazer, enjoy an exclusive 15% discount every time you stay with us.</p>
                  <div className="mb-8">
                    {/* <h4 className="font-bold mb-4 text-gray-800">Member Benefits</h4> */}
                    <ul className="space-y-3 mb-6">
                      {[
                        "Eligibility: 10+ stays",
                        "Loyalty Discount: 15%"

                      ].map((benefit, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: 0.1 + i * 0.1 }}
                          viewport={{ once: true }}
                        >
                          <Star className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0 text-amber-500" />
                          <span>{benefit}</span>
                        </motion.li>
                      ))}
                    </ul>

                    {/* <Button 
                      className="w-full border-2 border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white transition duration-300 font-semibold"
                      variant="outline"
                    >
                      Join Trailblazer
                    </Button> */}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Redesigned How It Works Section */}
        <div className="py-12 md:py-16 bg-gradient-to-r from-hotel-light to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 font-schibsted font-bold">How It Works</h2>
                <div className="w-24 h-1 bg-hotel-accent mx-auto mb-6"></div>
              </motion.div>
            </div>

            {/* New Layout with Process Steps and Description Card */}
            <div className="flex flex-col lg:flex-row gap-10 items-center max-w-6xl mx-auto">
              {/* Process Steps */}
              <div className="w-full lg:w-3/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      title: "Join",
                      icon: <Ticket className="text-hotel-primary" size={32} />,
                      description: "Sign up for free online or at any of our locations."
                    },
                    {
                      title: "Stay",
                      icon: <Star className="text-hotel-primary" size={32} />,
                      description: "Each stay counts toward your membership tier status."
                    },
                    {
                      title: "Save",
                      icon: <Award className="text-hotel-primary" size={32} />,
                      description: "Enjoy automatic discounts on all future bookings."
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={item.title}
                      className="relative"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.2, duration: 0.5 }}
                      viewport={{ once: true }}
                    >
                      {/* Step Number */}
                      <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-hotel-accent flex items-center justify-center text-white font-bold text-xl z-10">
                        {index + 1}
                      </div>

                      {/* Step Content */}
                      <div className="bg-white rounded-lg shadow-lg p-8 h-full flex flex-col items-center text-center relative z-0 border-t-4 border-hotel-accent">
                        <div className="bg-hotel-light p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          {item.icon}
                        </div>
                        <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                        <p className="text-gray-600">{item.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Description Card */}
              <motion.div
                className="w-full lg:w-2/5"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="bg-hotel-primary text-white p-8 md:p-10 rounded-xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 -mt-10 -mr-10 bg-hotel-accent/20 rounded-full"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 -mb-8 -ml-8 bg-hotel-accent/20 rounded-full"></div>

                  <h3 className="text-2xl text-hotel-accent font-bold mb-6 relative z-10">Seamless Savings</h3>

                  <div className="space-y-6 relative z-10">
                    <p className="text-lg text-white">
                      Your discount tier is based on your total number of stays with us.
                    </p>

                    <p className="text-lg text-white">
                      Discounts apply automatically when you book directly via buteaksuites.com using your registered email ID.
                    </p>

                    <div className="pt-4 border-t border-white/20">
                      <p className="text-lg font-light italic text-white">
                        No cards, no codes—just seamless savings.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div >
      <Footer />
    </>
  );
};

export default LoyaltyProgram;
