export interface PublicCapability {
  id: string;
  title: string;
  description: string;
  scope: string[];
  outputs: string[];
}

export interface PublicSolution {
  id: string;
  problem: string;
  architecture: string[];
  desiredState: string;
}

export interface TechnicalMetric {
  label: string;
  value: string;
  kind: "scope" | "target";
}

export interface PublicProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  category: string;
  scope: string[];
  metrics: TechnicalMetric[];
  technologies: string[];
}

export interface PublicCompanyInfo {
  about: string;
  vision: string;
  mission: string;
  address: string;
  hotline: string;
  email: string;
  hours: string;
}
