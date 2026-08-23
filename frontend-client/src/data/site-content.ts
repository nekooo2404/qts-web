import {
  Blueprint,
  CloudArrowUp,
  Fingerprint,
  FlowArrow,
  MagnifyingGlass,
  Pulse,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

import type {
  PublicCapability,
  PublicCompanyInfo,
  PublicProject,
  PublicSolution,
} from "@/types/public-content";

export const navigation = [
  { href: "/nang-luc", label: "Năng lực" },
  { href: "/giai-phap", label: "Giải pháp" },
  { href: "/du-an", label: "Dự án" },
] as const;

export const capabilityIcons: Record<string, Icon> = {
  architecture: Blueprint,
  integration: FlowArrow,
  security: Fingerprint,
  operations: Pulse,
};

export const capabilities: Array<PublicCapability & { iconKey: keyof typeof capabilityIcons }> = [
  {
    id: "architecture",
    title: "Kiến trúc hệ thống",
    description:
      "Chuyển bài toán vận hành thành bản thiết kế có ranh giới, luồng dữ liệu và tiêu chí nghiệm thu rõ ràng.",
    scope: ["Khảo sát hiện trạng", "Thiết kế kiến trúc mục tiêu", "Lộ trình chuyển đổi"],
    outputs: ["Sơ đồ kiến trúc", "Danh mục rủi ro", "Kế hoạch triển khai"],
    iconKey: "architecture",
  },
  {
    id: "integration",
    title: "Tích hợp và dữ liệu",
    description:
      "Kết nối ứng dụng, dữ liệu và quy trình qua các giao diện được quản trị và có thể quan sát.",
    scope: ["API và middleware", "Luồng dữ liệu", "Đồng bộ nghiệp vụ"],
    outputs: ["Hợp đồng tích hợp", "Bản đồ dữ liệu", "Kịch bản kiểm thử"],
    iconKey: "integration",
  },
  {
    id: "security",
    title: "An toàn thông tin",
    description:
      "Đưa kiểm soát an toàn vào từng lớp kiến trúc, từ danh tính đến giám sát và ứng cứu.",
    scope: ["Mô hình đe dọa", "Kiểm soát truy cập", "Giám sát sự kiện"],
    outputs: ["Ma trận kiểm soát", "Quy trình ứng cứu", "Kịch bản xác minh"],
    iconKey: "security",
  },
  {
    id: "operations",
    title: "Vận hành hệ thống",
    description:
      "Thiết kế khả năng quan sát, quy trình xử lý và vòng cải tiến cho toàn bộ vòng đời dịch vụ.",
    scope: ["Giám sát dịch vụ", "Quản lý sự cố", "Quản lý thay đổi"],
    outputs: ["Runbook vận hành", "Ngưỡng cảnh báo", "Chu kỳ cải tiến"],
    iconKey: "operations",
  },
];

export const projects: PublicProject[] = [
  {
    id: "security-operations-center",
    title: "Trung tâm điều hành an ninh mạng",
    description:
      "Kiến trúc thu thập, phân tích và điều phối sự kiện bảo mật cho môi trường nhiều hệ thống.",
    imageUrl: "/images/projects/security-operations-center.svg",
    imageAlt: "Sơ đồ trung tâm điều hành và luồng xử lý sự kiện an ninh mạng",
    category: "An toàn thông tin",
    scope: ["Thu thập log tập trung", "Chuẩn hóa và tương quan sự kiện", "Điều phối quy trình ứng cứu"],
    metrics: [
      { label: "Nguồn log trong phạm vi", value: "12", kind: "scope" },
      { label: "Lớp phân tích", value: "03", kind: "scope" },
      { label: "MTTA mục tiêu", value: "≤15 phút", kind: "target" },
    ],
    technologies: ["SIEM", "SOAR", "IAM", "Observability"],
  },
  {
    id: "enterprise-data-center",
    title: "Hạ tầng trung tâm dữ liệu doanh nghiệp",
    description:
      "Thiết kế hạ tầng phân vùng, dự phòng và quan sát được cho các dịch vụ nghiệp vụ quan trọng.",
    imageUrl: "/images/projects/data-center.svg",
    imageAlt: "Sơ đồ hạ tầng máy chủ với các tuyến kết nối dự phòng",
    category: "Hạ tầng số",
    scope: ["Phân vùng mạng và tải", "Dự phòng dịch vụ", "Sao lưu và khôi phục"],
    metrics: [
      { label: "Vùng hoạt động", value: "02", kind: "scope" },
      { label: "Môi trường vận hành", value: "03", kind: "scope" },
      { label: "RTO mục tiêu", value: "≤60 phút", kind: "target" },
    ],
    technologies: ["Virtualization", "Backup", "Network", "Monitoring"],
  },
  {
    id: "smart-city-platform",
    title: "Nền tảng điều phối dữ liệu đô thị",
    description:
      "Kiến trúc hợp nhất dữ liệu nhiều miền để hỗ trợ giám sát và phối hợp tác nghiệp.",
    imageUrl: "/images/projects/smart-city-platform.svg",
    imageAlt: "Sơ đồ các lớp dữ liệu kết nối trong vận hành đô thị",
    category: "Nền tảng dữ liệu",
    scope: ["Tiếp nhận dữ liệu đa nguồn", "Chuẩn hóa danh mục dùng chung", "Phân phối dữ liệu theo vai trò"],
    metrics: [
      { label: "Miền dữ liệu", value: "08", kind: "scope" },
      { label: "Lớp xử lý", value: "04", kind: "scope" },
      { label: "Môi trường triển khai", value: "03", kind: "scope" },
    ],
    technologies: ["Data Lake", "API Gateway", "Streaming", "GIS"],
  },
];

export const solutions: PublicSolution[] = [
  {
    id: "cybersecurity",
    problem: "Sự kiện an ninh nằm rải rác, khó phát hiện và phối hợp xử lý.",
    architecture: ["Nguồn sự kiện", "Thu thập và chuẩn hóa", "Phân tích và điều phối", "Ứng cứu"],
    desiredState:
      "Một luồng giám sát có trách nhiệm rõ ràng, có thể truy vết từ cảnh báo đến hành động xử lý.",
  },
  {
    id: "infrastructure",
    problem: "Hạ tầng phân mảnh khiến thay đổi chậm và khó kiểm soát độ sẵn sàng.",
    architecture: ["Tải nghiệp vụ", "Nền tảng hạ tầng", "Tự động hóa thay đổi", "Quan sát dịch vụ"],
    desiredState:
      "Một nền tảng có ranh giới vận hành, khả năng dự phòng và quy trình thay đổi được kiểm chứng.",
  },
  {
    id: "data-platform",
    problem: "Dữ liệu cùng một nghiệp vụ nhưng khác định nghĩa và không theo kịp quyết định.",
    architecture: ["Nguồn dữ liệu", "Tích hợp", "Quản trị dữ liệu", "Sản phẩm dữ liệu"],
    desiredState:
      "Một luồng dữ liệu có chủ sở hữu, tiêu chuẩn chất lượng và cách sử dụng nhất quán.",
  },
];

export const companyInfo: PublicCompanyInfo = {
  about:
    "QTS đồng hành cùng cơ quan, tổ chức và doanh nghiệp trong việc xây dựng hạ tầng số an toàn, ổn định và có khả năng mở rộng.",
  vision: "Trở thành đối tác công nghệ tin cậy, đồng hành cùng tổ chức Việt Nam trong hành trình phát triển bền vững.",
  mission: "Kiến tạo các giải pháp công nghệ an toàn, thực tiễn và tạo ra giá trị đo lường được cho khách hàng.",
  address: "Hà Nội, Việt Nam",
  hotline: "+842473000888",
  email: "info@qts.com.vn",
  hours: "Thứ 2 - Thứ 6, 08:00 - 17:30",
};

export const partners = [
  {
    name: "Vietcombank",
    src: "/images/partners/vietcombank.svg",
    width: 461,
    height: 157,
    sector: "Tài chính và ngân hàng",
    tags: ["Enterprise banking", "Core systems", "Security"],
    reviewDraft: "QTS giúp bài toán hệ thống được nhìn rõ từ kiến trúc đến vận hành.",
  },
  {
    name: "VNPT",
    src: "/images/partners/vnpt.png",
    width: 756,
    height: 207,
    sector: "Hạ tầng số",
    tags: ["Cloud infrastructure", "Enterprise network", "System integration"],
    reviewDraft: "Cách phối hợp rõ ràng, bám sát mục tiêu và tiêu chí nghiệm thu.",
  },
  {
    name: "FPT",
    src: "/images/partners/fpt.svg",
    width: 34,
    height: 21,
    sector: "Công nghệ và tích hợp",
    tags: ["Digital platform", "Integration", "Operations"],
    reviewDraft: "Đội ngũ QTS trao đổi thẳng vào vấn đề và phản hồi đúng trọng tâm.",
  },
  {
    name: "Vingroup",
    src: "/images/partners/vingroup.svg",
    width: 1024,
    height: 648,
    sector: "Hệ sinh thái doanh nghiệp",
    tags: ["Enterprise platform", "Data systems", "Operations"],
    reviewDraft: "QTS giữ được góc nhìn tổng thể khi nhiều nhóm cùng tham gia dự án.",
  },
  {
    name: "Masan",
    src: "/images/partners/masan.png",
    width: 240,
    height: 80,
    sector: "Sản xuất và bán lẻ",
    tags: ["Retail systems", "Supply chain", "Analytics"],
    reviewDraft: "Các quyết định kỹ thuật được giải thích bằng ngôn ngữ dễ phối hợp.",
  },
  {
    name: "PwC",
    src: "/images/partners/pwc.svg",
    width: 100,
    height: 100,
    sector: "Tư vấn doanh nghiệp",
    tags: ["Advisory systems", "Governance", "Data"],
    reviewDraft: "QTS đặt tính kiểm chứng và khả năng vận hành vào cùng một kế hoạch.",
  },
  {
    name: "Deloitte",
    src: "/images/partners/deloitte.svg",
    width: 892,
    height: 171,
    sector: "Tư vấn và kiểm toán",
    tags: ["Risk technology", "Audit workflow", "Data"],
    reviewDraft: "Hồ sơ bàn giao mạch lạc, giúp các bên tiếp tục công việc nhanh hơn.",
  },
  {
    name: "Samsung",
    src: "/images/partners/samsung.svg",
    width: 7051,
    height: 1080,
    sector: "Công nghệ và sản xuất",
    tags: ["Manufacturing systems", "Integration", "Operations"],
    reviewDraft: "QTS kết nối các lớp công nghệ thành một luồng vận hành có trách nhiệm.",
  },
] as const;

export const workflow = [
  {
    title: "Khảo sát",
    description: "Làm rõ mục tiêu, hiện trạng, ràng buộc và điểm nghẽn vận hành.",
    deliverable: "Báo cáo hiện trạng",
    icon: MagnifyingGlass,
  },
  {
    title: "Blueprint",
    description: "Chuyển phát hiện thành kiến trúc, lộ trình và tiêu chí nghiệm thu.",
    deliverable: "Kiến trúc và lộ trình",
    icon: Blueprint,
  },
  {
    title: "Triển khai",
    description: "Tích hợp theo từng lớp, kiểm thử tại mỗi mốc và kiểm soát thay đổi.",
    deliverable: "Hệ thống đã kiểm thử",
    icon: CloudArrowUp,
  },
  {
    title: "Vận hành",
    description: "Theo dõi dịch vụ, xử lý sự cố và cải tiến từ dữ liệu thực tế.",
    deliverable: "Runbook và chỉ số theo dõi",
    icon: Pulse,
  },
] as const;
