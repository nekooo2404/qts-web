import { CapabilitiesSection } from "@/components/home/capabilities-section";
import { HeroSection } from "@/components/home/hero-section";
import { HomeClosing } from "@/components/home/home-closing";
import { ProjectsSection } from "@/components/home/projects-section";
import { SolutionsPreview } from "@/components/home/solutions-preview";
import { WorkflowSection } from "@/components/home/workflow-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <WorkflowSection />
      <CapabilitiesSection />
      <ProjectsSection />
      <SolutionsPreview />
      <HomeClosing />
    </>
  );
}
