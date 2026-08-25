import { CapabilitiesSection } from "@/components/home/capabilities-section";
import { HeroSection } from "@/components/home/hero-section";
import { HomeClosing } from "@/components/home/home-closing";
import { ProjectsSection } from "@/components/home/projects-section";
import { SolutionsPreview } from "@/components/home/solutions-preview";
import { TrustedCompaniesStrip } from "@/components/home/trusted-companies-strip";
import { WorkflowSection } from "@/components/home/workflow-section";
import { ContentSourceNotice } from "@/components/shared/content-source-notice";
import { getProjects, getSolutions } from "@/lib/public-api";

export default async function HomePage() {
  const [projects, solutions] = await Promise.all([
    getProjects(),
    getSolutions(),
  ]);
  return (
    <main className="section-stack">
      <HeroSection />
      <ContentSourceNotice
        source={projects.source === "fixture" || solutions.source === "fixture" ? "fixture" : "cms"}
        reason={projects.reason ?? solutions.reason}
      />
      <TrustedCompaniesStrip />
      <CapabilitiesSection />
      <WorkflowSection />
      <SolutionsPreview items={solutions.data} />
      <ProjectsSection items={projects.data} />
      <HomeClosing />
    </main>
  );
}
