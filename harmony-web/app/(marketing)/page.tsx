import { HeroSection } from "@/components/marketing/HeroSection";
import { LogoStrip } from "@/components/marketing/LogoStrip";
import { FlaggedDraft } from "@/components/marketing/FlaggedDraft";
import { ReviewerExperience } from "@/components/marketing/ReviewerExperience";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { AnalyticsPanel } from "@/components/marketing/AnalyticsPanel";
import { Testimonial } from "@/components/marketing/Testimonial";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <LogoStrip />
      <FlaggedDraft />
      <div id="platform" />
      <ReviewerExperience />
      <FeatureGrid />
      <AnalyticsPanel />
      <Testimonial />
      <ClosingCTA />
    </>
  );
}
