import { EmployeeManagement } from "@/components/admin/employee-management";
import { DemoNotice } from "@/components/portal/demo-notice";
import { PageHeader } from "@/components/portal/page-header";

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        description="Theo dõi nhân sự, vai trò và quyền truy cập từng khu vực vận hành nội bộ."
        title="Nhân sự & phân quyền"
      />
      <DemoNotice>
        Backend đã có API người dùng, vai trò và quyền động. Frontend chưa nối các endpoint này nên thêm,
        xóa và đổi quyền chỉ cập nhật trong phiên trình duyệt.
      </DemoNotice>
      <EmployeeManagement />
    </>
  );
}
