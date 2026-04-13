import Navbar from "../components/layout/Navbar";
import PageTransition from "../components/animations/PageTransition";
import LandingHero from "../features/landing/LandingHero";
import LandingJourney from "../features/landing/LandingJourney";

function LandingPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[radial-gradient(circle_at_20%_15%,rgba(249,170,123,0.21),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(107,143,209,0.18),transparent_28%),linear-gradient(180deg,#fffaf4_0%,#fff7ef_48%,#fffdfb_100%)] text-[#1f2a44]">
        <Navbar />
        <main>
          <LandingHero />
          <LandingJourney />
        </main>
      </div>
    </PageTransition>
  );
}

export default LandingPage;
