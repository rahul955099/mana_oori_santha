import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LocationModal } from "@/components/location/LocationModal";
import { FirstVisitLocationPrompt } from "@/components/location/FirstVisitLocationPrompt";
import { FloatingSupportButton } from "@/components/support/FloatingSupportButton";
import { SupportModal } from "@/components/support/SupportModal";

export function MainLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <LocationModal />
      <FirstVisitLocationPrompt />
      <FloatingSupportButton />
      <SupportModal />
    </div>
  );
}
