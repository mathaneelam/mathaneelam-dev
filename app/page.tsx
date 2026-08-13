import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import WhatsAppFab from "@/components/WhatsAppFab";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import VoiceDemo from "@/components/sections/VoiceDemo";
import Services from "@/components/sections/Services";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import About from "@/components/sections/About";
import FAQ from "@/components/sections/FAQ";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <VoiceDemo />
        <Services />
        <HowItWorks />
        <Pricing />
        <About />
        <FAQ />
        <Contact />
      </main>
      <Footer />
      <WhatsAppFab />
      <Reveal />
    </>
  );
}
