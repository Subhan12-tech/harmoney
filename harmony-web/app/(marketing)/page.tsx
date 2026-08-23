import { HeroSection } from "@/components/marketing/HeroSection";
import { FlaggedDraft } from "@/components/marketing/FlaggedDraft";
import { ReviewerExperience } from "@/components/marketing/ReviewerExperience";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { AnalyticsPanel } from "@/components/marketing/AnalyticsPanel";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FlaggedDraft />
      <div id="platform" />
      <ReviewerExperience />
      <FeatureGrid />
      <AnalyticsPanel />
      <ClosingCTA />
    </>
  );
}
