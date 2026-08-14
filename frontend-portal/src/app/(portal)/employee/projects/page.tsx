import type { Metadata } from "next";

import { ProjectResources } from "@/components/employee/project-resources";
import { DemoNotice } from "@/components/portal/demo-notice";
import { PageHeader } from "@/components/portal/page-header";
import { DEMO_PROJECT_RESOURCES } from "@/lib/demo/employee-data";

export const metadata: Metadata = {
  title: "Tài nguyên dự án",
};

export default function EmployeeProjectsPage() {
  return (
    <>
      <PageHeader
        description="Truy cập các gói bàn giao, cấu hình tham chiếu và hồ sơ dự án đã được phân công cho nhóm của bạn."
        title="Tài nguyên dự án"
      />
      <DemoNotice>
        Backend đã có luồng tải archive sạch theo quyền. Frontend chưa nối endpoint nên các nút hiện tạo
        placeholder đúng tên và đuôi .zip/.rar, không phải archive sản phẩm thật.
      </DemoNotice>
      <ProjectResources projects={DEMO_PROJECT_RESOURCES} />
    </>
  );
}
