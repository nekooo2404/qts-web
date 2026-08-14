import { TaskBoard } from "@/components/admin/task-board";
import { DemoNotice } from "@/components/portal/demo-notice";
import { PageHeader } from "@/components/portal/page-header";

export default function TasksPage() {
  return (
    <>
      <PageHeader
        description="Điều phối công việc theo trạng thái, người phụ trách và mức ưu tiên trên một bảng vận hành."
        title="Theo dõi công việc"
      />
      <DemoNotice>
        Backend đã có API công việc theo phạm vi. Màn hình chưa nối adapter nên kéo thả và chuyển cột chỉ
        tồn tại trong phiên trình duyệt.
      </DemoNotice>
      <TaskBoard />
    </>
  );
}
