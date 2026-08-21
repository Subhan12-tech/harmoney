import { HeroSection } from "@/components/HeroSection";
import { LogoStrip } from "@/components/LogoStrip";
import { FlaggedDraft } from "@/components/FlaggedDraft";
import { ReviewerExperience } from "@/components/ReviewerExperience";
import { FeatureGrid } from "@/components/FeatureGrid";
import { AnalyticsPanel } from "@/components/AnalyticsPanel";
import { Testimonial } from "@/components/Testimonial";
import { ClosingCTA } from "@/components/ClosingCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <LogoStrip />
      <FlaggedDraft />
      <ReviewerExperience />
      <FeatureGrid />
      <AnalyticsPanel />
      <Testimonial />
      <ClosingCTA />
      <Footer />
    </main>
  );
}
