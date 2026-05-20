
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
//@ts-ignore
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import AboutUs from "./pages/AboutUs";
import Rooms from "./pages/Rooms";
// import Amenities from "@/components/LuxuryAmenitiesShowcase";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import BookNow from "./pages/BookNow";
import Amenities from "./pages/Amenities"
import LocationPage from "./pages/LocationPage";
import DevelopersAndOwners from "./pages/DevelopersAndOwners";
import LoyaltyProgram from "./pages/LoyaltyProgram";
import Career from "./pages/Career";
import CompanyStory from "./pages/CompanyStory";
import CompanyNews from "./pages/CompanyNews";
import PressMedia from "./pages/PressMedia";
import NotFound from "./pages/NotFound";
import HotelPage from "./pages/HotelPage";
import HotelRoomDetailPage from "./pages/HotelRoomDetailPage";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
// Importing the new CSS file

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/amenities" element={<Amenities />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/book-now" element={<BookNow />} />
          <Route path="/developers" element={<DevelopersAndOwners />} />
          <Route path="/loyalty-program" element={<LoyaltyProgram />} />
          <Route path="/hotels" element={<HotelPage />} />
          <Route path="/career" element={<Career />} />
          <Route path="/company-story" element={<CompanyStory />} />
          <Route path="/company-news" element={<CompanyNews />} />
          <Route path="/press-media" element={<PressMedia />} />
          <Route path="/locations/:locationId" element={<LocationPage />} />
          <Route path="/hotel-room/:roomId" element={<HotelRoomDetailPage />} />
          <Route path="/terms-and-conditions" element={<TermsConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
