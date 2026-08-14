export type CmsDraft = {
  heroTitle: string;
  heroSummary: string;
  primaryActionLabel: string;
  primaryActionUrl: string;
  contactEmail: string;
  seoTitle: string;
  seoDescription: string;
};

export const INITIAL_CMS_DRAFT: CmsDraft = {
  heroTitle: "Giải pháp công nghệ cho vận hành an toàn",
  heroSummary:
    "QTS đồng hành cùng doanh nghiệp trong chuyển đổi số, an toàn thông tin và phát triển nền tảng vận hành.",
  primaryActionLabel: "Trao đổi cùng QTS",
  primaryActionUrl: "/lien-he",
  contactEmail: "contact@qts.com.vn",
  seoTitle: "QTS - Giải pháp công nghệ và an toàn thông tin",
  seoDescription:
    "Khám phá năng lực tư vấn, triển khai và vận hành nền tảng công nghệ của QTS.",
};

export type EmployeeRole = "EMPLOYEE" | "ADMIN";
export type EmployeeStatus = "ACTIVE" | "INVITED";
export type PermissionKey = "contracts" | "cms" | "employees" | "tasks";

export type EmployeeRecord = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  permissions: Record<PermissionKey, boolean>;
};

export const PERMISSION_COLUMNS: Array<{ key: PermissionKey; label: string }> = [
  { key: "contracts", label: "Hợp đồng" },
  { key: "cms", label: "CMS" },
  { key: "employees", label: "Nhân sự" },
  { key: "tasks", label: "Công việc" },
];

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: "QTS-012",
    name: "Nguyễn Minh Anh",
    email: "minh.anh@qts.com.vn",
    department: "Kinh doanh",
    role: "EMPLOYEE",
    status: "ACTIVE",
    permissions: { contracts: true, cms: false, employees: false, tasks: true },
  },
  {
    id: "QTS-018",
    name: "Trần Gia Huy",
    email: "gia.huy@qts.com.vn",
    department: "Pháp chế",
    role: "EMPLOYEE",
    status: "ACTIVE",
    permissions: { contracts: true, cms: false, employees: false, tasks: true },
  },
  {
    id: "QTS-021",
    name: "Lê Thanh Hà",
    email: "thanh.ha@qts.com.vn",
    department: "Truyền thông",
    role: "EMPLOYEE",
    status: "INVITED",
    permissions: { contracts: false, cms: true, employees: false, tasks: true },
  },
  {
    id: "QTS-003",
    name: "Phạm Hoàng Long",
    email: "hoang.long@qts.com.vn",
    department: "Vận hành",
    role: "ADMIN",
    status: "ACTIVE",
    permissions: { contracts: true, cms: true, employees: true, tasks: true },
  },
];

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type DemoTask = {
  id: string;
  title: string;
  project: string;
  assignee: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
};

export const TASK_COLUMNS: Array<{
  id: TaskStatus;
  label: string;
  description: string;
}> = [
  { id: "TODO", label: "Cần làm", description: "Đã lên kế hoạch, chưa bắt đầu" },
  { id: "IN_PROGRESS", label: "Đang thực hiện", description: "Đang có người phụ trách" },
  { id: "DONE", label: "Hoàn thành", description: "Đã bàn giao hoặc nghiệm thu" },
];

export const INITIAL_TASKS: DemoTask[] = [
  {
    id: "TASK-241",
    title: "Rà soát điều khoản bảo mật hợp đồng MSA",
    project: "Hạ tầng dữ liệu An Phát",
    assignee: "Trần Gia Huy",
    dueDate: "18/08/2026",
    priority: "HIGH",
    status: "TODO",
  },
  {
    id: "TASK-244",
    title: "Chuẩn bị bộ tài nguyên bàn giao sprint 04",
    project: "QTS Cloud Console",
    assignee: "Nguyễn Minh Anh",
    dueDate: "20/08/2026",
    priority: "MEDIUM",
    status: "TODO",
  },
  {
    id: "TASK-237",
    title: "Cập nhật nội dung trang năng lực SOC",
    project: "QTS Public Website",
    assignee: "Lê Thanh Hà",
    dueDate: "15/08/2026",
    priority: "HIGH",
    status: "IN_PROGRESS",
  },
  {
    id: "TASK-239",
    title: "Đối soát danh sách nghiệm thu tháng 8",
    project: "Vận hành nội bộ",
    assignee: "Phạm Hoàng Long",
    dueDate: "22/08/2026",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
  },
  {
    id: "TASK-228",
    title: "Chuẩn hóa biểu mẫu đề nghị thanh toán",
    project: "Vận hành nội bộ",
    assignee: "Trần Gia Huy",
    dueDate: "11/08/2026",
    priority: "LOW",
    status: "DONE",
  },
  {
    id: "TASK-231",
    title: "Kiểm tra gói tài liệu triển khai khách hàng",
    project: "Hạ tầng dữ liệu An Phát",
    assignee: "Nguyễn Minh Anh",
    dueDate: "12/08/2026",
    priority: "MEDIUM",
    status: "DONE",
  },
];
