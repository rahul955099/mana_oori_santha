import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { Loading } from "@/components/common/Loading";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LocationModal } from "@/components/location/LocationModal";
import { FirstVisitLocationPrompt } from "@/components/location/FirstVisitLocationPrompt";
import { FloatingSupportButton } from "@/components/support/FloatingSupportButton";
import { SupportModal } from "@/components/support/SupportModal";
import { RouteSeo } from "@/components/common/RouteSeo";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";

export function MainLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <RouteSeo />
      <VerifyEmailBanner />
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <LocationModal />
      <FirstVisitLocationPrompt />
      <FloatingSupportButton />
      <SupportModal />
    </div>
  );
}
