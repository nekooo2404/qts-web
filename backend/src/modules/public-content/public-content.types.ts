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

export interface PublicMetric {
  id: string;
  key: string;
  label: string;
  value: string;
  suffix: string | null;
}

export interface CompanyInfo {
  about: string;
  vision: string;
  mission: string;
  address: string;
  hotline: string;
  updatedAt: Date;
}
