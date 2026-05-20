
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CompanyNews = () => {
  const location = useLocation();

  // Effect to scroll to top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Sample news data - in a real application this would come from an API or CMS
  const newsItems = [
    {
      id: 1,
      title: "Buteak Suites Raises $50M in Series B Funding",
      date: "April 28, 2025",
      source: "Economic Times",
      excerpt: "Buteak Suites has secured $50 million in Series B funding led by Sequoia Capital India, with participation from existing investors...",
      imageUrl: "https://images.unsplash.com/photo-1551909616-7921c6e5d42a?q=80&w=2069"
    },
    {
      id: 2,
      title: "Expansion to 5 New Cities Announced",
      date: "March 15, 2025",
      source: "Hospitality Today",
      excerpt: "Buteak Suites is expanding its operations to 5 new cities across India, including Jaipur, Kochi, and Chandigarh...",
      imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070"
    },
    {
      id: 3,
      title: "Buteak Wins 'Most Innovative Hospitality Concept' Award",
      date: "February 10, 2025",
      source: "Travel & Leisure India",
      excerpt: "At the annual Hospitality Excellence Awards, Buteak Suites was recognized as the 'Most Innovative Hospitality Concept'...",
      imageUrl: "https://images.unsplash.com/photo-1565688534245-05d6b5be184a?q=80&w=2070"
    },
    {
      id: 4,
      title: "New Smart Suite Technology Launched",
      date: "January 22, 2025",
      source: "Tech Innovators",
      excerpt: "Buteak Suites has launched its proprietary smart room technology allowing guests to control every aspect of their stay through a mobile app...",
      imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2070"
    },
    {
      id: 5,
      title: "CEO Featured in 'Top 40 Under 40' List",
      date: "December 5, 2024",
      source: "Business Insider India",
      excerpt: "Buteak Suites' founder and CEO has been featured in Business Insider's annual 'Top 40 Under 40' list of entrepreneurs transforming industries...",
      imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-hotel-accent py-16 md:py-24 overflow-hidden">
          {/* Background Image with Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0" 
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070')",
              opacity: "0.2" 
            }}
          />
          
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto">
              <Button variant="outline" className="mb-8 text-white border-white hover:bg-white hover:text-hotel-accent" asChild>
                <Link to="/career" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Careers
                </Link>
              </Button>
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-schibsted">
                  See Us in the News
                </h1>
                <h2 className="text-xl md:text-2xl text-white/90 font-medium">
                  Media Coverage & Press Releases
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* News Content */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-5xl mx-auto">
              <div className="space-y-12">
                {newsItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="md:flex">
                      <div className="md:w-1/3">
                        <div className="h-64 md:h-full bg-gray-200">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="md:w-2/3 p-6 md:p-8">
                        <div className="text-sm text-gray-500 mb-2">{item.date} • {item.source}</div>
                        <h3 className="text-xl md:text-2xl font-bold mb-4 text-hotel-primary">{item.title}</h3>
                        <p className="text-gray-700 mb-6">{item.excerpt}</p>
                        <Button variant="outline" className="border-hotel-accent text-hotel-accent hover:bg-hotel-accent hover:text-white">
                          Read Full Article
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-16 p-8 bg-white rounded-lg shadow text-center">
                <h3 className="text-2xl font-bold mb-4 text-hotel-primary">Looking for More Information?</h3>
                <p className="text-gray-600 mb-6">
                  For press inquiries, interview requests, or additional information about Buteak Suites, please contact our media relations team.
                </p>
                <Button className="bg-hotel-accent hover:bg-hotel-primary text-white" asChild>
                  <Link to="/press-media">
                    Visit Press & Media Center
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default CompanyNews;
