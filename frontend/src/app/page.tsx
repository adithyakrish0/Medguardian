import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeatureGrid from '@/components/FeatureGrid';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-medical-light">
      <Navbar />
      <Hero />
      <FeatureGrid />
      <Footer />
    </main>
  );
}
