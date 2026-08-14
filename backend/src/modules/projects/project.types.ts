export interface PublicProject {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  publishedAt: Date;
}

export interface ProjectListQuery {
  page: number;
  pageSize: number;
  category?: string;
}
