export const LEAD_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "CONTACTED",
  "CLOSED",
  "SPAM",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface DemoLead {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  message: string;
  status: LeadStatus;
  assignedAt: string;
  createdAt: string;
}

export type ProjectResourceFormat = "zip" | "rar";

export interface DemoProjectResource {
  id: string;
  projectName: string;
  clientName: string;
  description: string;
  updatedAt: string;
  owner: string;
  resources: ReadonlyArray<{
    id: string;
    label: string;
    fileName: string;
    format: ProjectResourceFormat;
    sizeLabel: string;
    version: string;
  }>;
}

// These records are deliberately isolated demo fixtures until portal CRUD APIs are wired.
export const DEMO_ASSIGNED_LEADS: readonly DemoLead[] = [
  {
    id: "lead-demo-1008",
    customerName: "Công ty Minh Phú",
    phone: "090 000 1008",
    email: "lienhe@example.com",
    message: "Cần tư vấn nền tảng quản trị dữ liệu và lộ trình triển khai theo giai đoạn.",
    status: "NEW",
    assignedAt: "2026-08-13T01:45:00.000Z",
    createdAt: "2026-08-13T01:32:00.000Z",
  },
  {
    id: "lead-demo-1007",
    customerName: "Trung tâm Điều hành Số",
    phone: "090 000 1007",
    email: "dieuhanh@example.com",
    message: "Đề nghị trao đổi giải pháp tích hợp giám sát tập trung cho các đơn vị trực thuộc.",
    status: "IN_PROGRESS",
    assignedAt: "2026-08-12T09:05:00.000Z",
    createdAt: "2026-08-12T08:40:00.000Z",
  },
  {
    id: "lead-demo-1006",
    customerName: "Công ty Hạ tầng Bắc Việt",
    phone: "090 000 1006",
    email: "duan@example.com",
    message: "Quan tâm bộ giải pháp giám sát hạ tầng và cần tài liệu năng lực kỹ thuật.",
    status: "CONTACTED",
    assignedAt: "2026-08-11T03:20:00.000Z",
    createdAt: "2026-08-11T02:58:00.000Z",
  },
  {
    id: "lead-demo-1005",
    customerName: "Ban Quản lý Dự án Thành Đông",
    phone: "090 000 1005",
    email: "pmu@example.com",
    message: "Đã thống nhất phạm vi sơ bộ, chờ đầu mối xác nhận lịch khảo sát hiện trạng.",
    status: "CLOSED",
    assignedAt: "2026-08-08T07:10:00.000Z",
    createdAt: "2026-08-08T06:42:00.000Z",
  },
  {
    id: "lead-demo-1004",
    customerName: "Biểu mẫu kiểm thử",
    phone: "090 000 1004",
    email: "spam@example.com",
    message: "Bản ghi minh họa được đánh dấu để kiểm thử trạng thái thư rác.",
    status: "SPAM",
    assignedAt: "2026-08-07T04:25:00.000Z",
    createdAt: "2026-08-07T04:20:00.000Z",
  },
];

export const DEMO_PROJECT_RESOURCES: readonly DemoProjectResource[] = [
  {
    id: "project-demo-portal",
    projectName: "QTS Internal Portal",
    clientName: "QTS",
    description: "Bộ giao diện, quy ước bàn giao và tài liệu nghiệm thu cho không gian quản trị nội bộ.",
    updatedAt: "2026-08-13T02:15:00.000Z",
    owner: "Nhóm Nền tảng số",
    resources: [
      {
        id: "portal-handover",
        label: "Gói bàn giao giao diện",
        fileName: "qts-internal-portal-demo.zip",
        format: "zip",
        sizeLabel: "Tệp mẫu",
        version: "v0.1-demo",
      },
      {
        id: "portal-acceptance",
        label: "Hồ sơ nghiệm thu",
        fileName: "qts-portal-acceptance-demo.rar",
        format: "rar",
        sizeLabel: "Tệp mẫu",
        version: "v0.1-demo",
      },
    ],
  },
  {
    id: "project-demo-command",
    projectName: "Trung tâm Điều hành Số",
    clientName: "Khách hàng minh họa",
    description: "Tài liệu mô hình tích hợp, danh mục yêu cầu và gói cấu hình tham chiếu cho dự án.",
    updatedAt: "2026-08-12T08:30:00.000Z",
    owner: "Nhóm Tích hợp hệ thống",
    resources: [
      {
        id: "command-reference",
        label: "Cấu hình tham chiếu",
        fileName: "digital-command-reference-demo.zip",
        format: "zip",
        sizeLabel: "Tệp mẫu",
        version: "v0.3-demo",
      },
    ],
  },
  {
    id: "project-demo-monitoring",
    projectName: "Giám sát Hạ tầng Bắc Việt",
    clientName: "Khách hàng minh họa",
    description: "Gói biên bản khảo sát và tài liệu kiến trúc ở định dạng nén dùng cho luồng tải xuống.",
    updatedAt: "2026-08-09T03:45:00.000Z",
    owner: "Nhóm Hạ tầng",
    resources: [
      {
        id: "monitoring-survey",
        label: "Biên bản khảo sát",
        fileName: "north-infra-survey-demo.rar",
        format: "rar",
        sizeLabel: "Tệp mẫu",
        version: "v0.2-demo",
      },
      {
        id: "monitoring-architecture",
        label: "Tài liệu kiến trúc",
        fileName: "north-infra-architecture-demo.zip",
        format: "zip",
        sizeLabel: "Tệp mẫu",
        version: "v0.2-demo",
      },
    ],
  },
];
