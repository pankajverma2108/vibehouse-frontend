
// import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import DeveloperHero from '@/components/DeveloperHero';
import BrandValueProposition from '@/components/BrandValueProposition';
import PartnerRequirements from '@/components/PartnerRequirements';
import ExpectationsSection from '@/components/ExpectationsSection';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const DevelopersAndOwners = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <DeveloperHero />
        <BrandValueProposition />
        <PartnerRequirements />
        <ExpectationsSection />
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid gap-8 md:gap-8">
            <section>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Partnership Opportunities</h2>
              <div className="w-24 h-1 bg-hotel-accent  mt-4 mb-6"></div>
              <p className="text-hotel-body text-lg mb-4">
                Buteak Suites offers exceptional partnership opportunities for property developers and individual owners
                looking to maximize returns on their real estate investments. Our proven operational model and brand
                recognition can help transform your property into a high-performing hospitality asset.
              </p>
              <p className="text-hotel-body text-lg mb-4">
                Whether you're developing a new property or looking to reposition an existing one, our flexible partnership
                structures are designed to align our interests and drive mutual success.
              </p>
            </section>

            <section>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">For Developers</h2>
              <div className="w-24 h-1 bg-hotel-accent mt-4 mb-6"></div>
              <p className="text-hotel-body text-lg mb-4">
                Partner with Buteak Suites from the design phase to create properties perfectly suited to our award-winning
                operational model. We provide:
              </p>
              <ul className="list-disc pl-6 text-hotel-body text-lg space-y-2 mb-4">
                <li>Design consultation to maximize space efficiency and guest experience</li>
                <li>Pre-opening support including staffing, systems implementation, and marketing</li>
                <li>Long-term operational management with transparent reporting</li>
                <li>Access to our established booking channels and customer base</li>
              </ul>
            </section>

            <section>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">For Property Owners</h2>
              <div className="w-24 h-1 bg-hotel-accent mt-4 mb-6"></div>
              <p className="text-hotel-body text-lg mb-4">
                Convert your property into a revenue-generating asset under the prestigious Buteak Suites brand:
              </p>
              <ul className="list-disc pl-6 text-hotel-body text-lg space-y-2 mb-4">
                <li>Flexible management or lease agreements tailored to your investment goals</li>
                <li>Property enhancement recommendations to meet our brand standards</li>
                <li>Professional revenue management to optimize occupancy and rates</li>
                <li>Regular maintenance and quality control to protect your investment</li>
              </ul>
            </section>

            {/* Ready to Partner Section with gradient background */}
            <section className="rounded-xl overflow-hidden">
              <motion.div
                className="bg-hotel-primary p-8 md:p-12 rounded-xl shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="max-w-3xl mx-auto text-center">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white mb-6">
                    Ready to Partner with Buteak Suites?
                  </h2>
                  <p className="text-lg text-white/90 mb-8">
                    Email us your name, organization, and property details—including location—and we’ll take it from there.
                  </p>
                  <a href="mailto:partners@buteaksuites.com">
                    <p className="text-lg text-white/90 mb-8">partners@buteaksuites.com</p>
                  </a>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button
                      size="lg"
                      className="bg-white text-hotel-primary rounded-[23px] hover:bg-white/90 font-medium text-base px-6"
                      onClick={() => window.location.href = 'mailto:partners@buteaksuites.com'}
                    >
                      Email Us Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    {/* <Button 
                      variant="outline" 
                      size="lg"
                      className="bg-transparent border-white text-white hover:bg-white/10 font-medium text-base px-6"
                      asChild
                    >
                      <a href="/contact">Contact Page</a>
                    </Button> */}
                  </div>
                </div>
              </motion.div>
            </section>


          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DevelopersAndOwners;
