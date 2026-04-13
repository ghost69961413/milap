import Navbar from "../components/layout/Navbar";
import HeroSection from "../features/home/HeroSection";

function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(191,61,28,0.16),_transparent_38%),linear-gradient(180deg,_#fffaf5_0%,_#fff_55%,_#fff7f0_100%)] text-slate-900">
      <Navbar />
      <main>
        <HeroSection />
      </main>
    </div>
  );
}

export default HomePage;

