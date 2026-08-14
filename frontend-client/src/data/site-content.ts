import {
  Buildings,
  CloudArrowUp,
  HeadCircuit,
  Lifebuoy,
  LockKey,
  Network,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

import type {
  PublicCapability,
  PublicCompanyInfo,
  PublicProject,
  PublicSolution,
} from "@/types/public-content";

export const navigation = [
  { href: "/", label: "Trang chủ" },
  { href: "/nang-luc", label: "Năng lực" },
  { href: "/du-an", label: "Dự án" },
  { href: "/giai-phap", label: "Giải pháp" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/lien-he", label: "Liên hệ" },
] as const;

export const capabilityIcons: Record<string, Icon> = {
  architecture: HeadCircuit,
  integration: Network,
  security: LockKey,
  operations: Lifebuoy,
};

export const capabilities: Array<PublicCapability & { iconKey: keyof typeof capabilityIcons }> = [
  {
    id: "architecture",
    title: "Tư vấn và thiết kế kiến trúc",
    description:
      "Đánh giá hiện trạng và thiết kế lộ trình công nghệ phù hợp với mục tiêu kinh doanh.",
    iconUrl: null,
    iconKey: "architecture",
  },
  {
    id: "integration",
    title: "Tích hợp hệ thống",
    description:
      "Kết nối nền tảng, dữ liệu và quy trình thành một hệ thống vận hành thống nhất.",
    iconUrl: null,
    iconKey: "integration",
  },
  {
    id: "security",
    title: "An toàn thông tin",
    description: "Bảo vệ hạ tầng và dữ liệu theo mô hình phòng thủ nhiều lớp.",
    iconUrl: null,
    iconKey: "security",
  },
  {
    id: "operations",
    title: "Vận hành và hỗ trợ",
    description: "Giám sát chủ động, xử lý sự cố và tối ưu hệ thống trong suốt vòng đời.",
    iconUrl: null,
    iconKey: "operations",
  },
];

export const projects: PublicProject[] = [
  {
    id: "security-operations-center",
    title: "Trung tâm điều hành an ninh mạng",
    description:
      "Nền tảng giám sát, phát hiện và điều phối ứng cứu sự cố an ninh mạng tập trung.",
    imageUrl: "/images/projects/security-operations-center.svg",
    imageAlt: "Minh họa trung tâm điều hành và luồng xử lý sự cố an ninh mạng",
    category: "Cybersecurity",
    publishedAt: "2026-08-01T01:00:00.000Z",
    filterClass: "mayfair",
  },
  {
    id: "enterprise-data-center",
    title: "Hạ tầng trung tâm dữ liệu doanh nghiệp",
    description:
      "Kiến trúc hạ tầng sẵn sàng cao, có khả năng mở rộng và vận hành liên tục.",
    imageUrl: "/images/projects/data-center.svg",
    imageAlt: "Minh họa hạ tầng máy chủ với các đường kết nối dự phòng",
    category: "Infrastructure",
    publishedAt: "2026-08-02T01:00:00.000Z",
    filterClass: "hudson",
  },
  {
    id: "smart-city-platform",
    title: "Nền tảng quản trị đô thị thông minh",
    description:
      "Hợp nhất dữ liệu vận hành để hỗ trợ giám sát và ra quyết định theo thời gian thực.",
    imageUrl: "/images/projects/smart-city-platform.svg",
    imageAlt: "Minh họa các lớp dữ liệu kết nối trong vận hành đô thị thông minh",
    category: "Digital Transformation",
    publishedAt: "2026-08-03T01:00:00.000Z",
    filterClass: "reyes",
  },
];

export const solutions: PublicSolution[] = [
  {
    id: "cybersecurity",
    problem: "Rủi ro an ninh mạng ngày càng phức tạp",
    solution: "Giám sát và ứng cứu an ninh mạng toàn diện",
    description:
      "Kết hợp công nghệ, quy trình và chuyên gia để bảo vệ hệ thống liên tục.",
  },
  {
    id: "infrastructure",
    problem: "Hạ tầng phân mảnh và khó mở rộng",
    solution: "Hiện đại hóa hạ tầng số",
    description:
      "Chuẩn hóa kiến trúc, tối ưu tài nguyên và nâng cao độ sẵn sàng của dịch vụ.",
  },
  {
    id: "data-platform",
    problem: "Dữ liệu chưa được khai thác hiệu quả",
    solution: "Nền tảng dữ liệu và phân tích thông minh",
    description:
      "Kết nối các nguồn dữ liệu để tạo thông tin quản trị nhất quán và kịp thời.",
  },
];

export const companyInfo: PublicCompanyInfo = {
  vision:
    "Trở thành đối tác công nghệ tin cậy, đồng hành cùng tổ chức Việt Nam trong hành trình phát triển bền vững.",
  mission:
    "Kiến tạo các giải pháp công nghệ an toàn, thực tiễn và tạo ra giá trị đo lường được cho khách hàng.",
  address: "Hà Nội, Việt Nam",
  hotline: "+842473000888",
};

export const workflow = [
  {
    title: "Hiểu đúng bài toán",
    description: "Làm rõ mục tiêu, ràng buộc và những điểm nghẽn đang ảnh hưởng đến vận hành.",
    icon: Buildings,
  },
  {
    title: "Thiết kế kiến trúc",
    description: "Chuyển nhu cầu thành mô hình hệ thống, lộ trình và tiêu chí nghiệm thu rõ ràng.",
    icon: HeadCircuit,
  },
  {
    title: "Triển khai có kiểm soát",
    description: "Tích hợp từng lớp, kiểm thử và đưa hệ thống vào sử dụng theo các mốc đo được.",
    icon: CloudArrowUp,
  },
  {
    title: "Vận hành và cải tiến",
    description: "Theo dõi, xử lý sự cố và tối ưu liên tục theo nhu cầu thực tế.",
    icon: Lifebuoy,
  },
] as const;
