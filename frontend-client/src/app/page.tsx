import { CapabilitiesSection } from "@/components/home/capabilities-section";
import { HeroSection } from "@/components/home/hero-section";
import { HomeClosing } from "@/components/home/home-closing";
import { ProjectsSection } from "@/components/home/projects-section";
import { SolutionsPreview } from "@/components/home/solutions-preview";
import { TrustedCompaniesStrip } from "@/components/home/trusted-companies-strip";
import { WorkflowSection } from "@/components/home/workflow-section";
import { getCapabilities, getProjects, getSolutions } from "@/lib/public-api";

export default async function HomePage() {
  const [capabilities, projects, solutions] = await Promise.all([
    getCapabilities(),
    getProjects(),
    getSolutions(),
  ]);
  return (
    <main>
      <HeroSection />
      <WorkflowSection />
      <CapabilitiesSection items={capabilities} />
      <SolutionsPreview items={solutions} />
      <ProjectsSection items={projects} />
      <HomeClosing />
      <TrustedCompaniesStrip />
    </main>
  );
}
