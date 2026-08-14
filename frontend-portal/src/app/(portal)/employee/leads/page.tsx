import type { Metadata } from "next";

import { LeadManagement } from "@/components/employee/lead-management";
import { DemoNotice } from "@/components/portal/demo-notice";
import { PageHeader } from "@/components/portal/page-header";
import { DEMO_ASSIGNED_LEADS } from "@/lib/demo/employee-data";

export const metadata: Metadata = {
  title: "Quản lý khách hàng",
};

export default function EmployeeLeadsPage() {
  return (
    <>
      <PageHeader
        description="Theo dõi yêu cầu được phân công, cập nhật tiến độ liên hệ và xử lý từng đầu mối trong một danh sách tập trung."
        title="Quản lý khách hàng"
      />
      <DemoNotice>
        Backend đã có endpoint lead được phân công. Frontend chưa nối adapter nên trang dùng fixture tách
        khỏi dữ liệu thật; trạng thái vẫn bám đúng contract backend.
      </DemoNotice>
      <LeadManagement initialLeads={DEMO_ASSIGNED_LEADS} />
    </>
  );
}
