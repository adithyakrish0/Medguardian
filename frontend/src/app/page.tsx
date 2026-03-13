import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FloatingFeaturesBar from '@/components/FloatingFeaturesBar';
import FeatureGrid from '@/components/FeatureGrid';
import HowItWorks from '@/components/HowItWorks';
import TechStack from '@/components/TechStack';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 selection:bg-blue-500/30">
      <Navbar />
      <Hero />
      <FloatingFeaturesBar />
      <FeatureGrid />
      <HowItWorks />
      <TechStack />
      <Footer />
    </main>
  );
}
