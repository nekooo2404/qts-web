export interface PublicCapability {
  id: string;
  title: string;
  description: string;
  iconUrl: string | null;
}

export interface PublicSolution {
  id: string;
  problem: string;
  solution: string;
  description: string;
}

export interface PublicProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  category: string;
  publishedAt: string;
  filterClass: "mayfair" | "reyes" | "hudson";
}

export interface PublicCompanyInfo {
  vision: string;
  mission: string;
  address: string;
  hotline: string;
}
