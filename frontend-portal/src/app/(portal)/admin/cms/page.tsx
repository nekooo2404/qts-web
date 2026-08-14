import { CmsEditor } from "@/components/admin/cms-editor";
import { DemoNotice } from "@/components/portal/demo-notice";
import { PageHeader } from "@/components/portal/page-header";

export default function CmsPage() {
  return (
    <>
      <PageHeader
        description="Chuẩn bị nội dung trang chủ và metadata trước khi chuyển sang quy trình duyệt, xuất bản."
        title="Nội dung web public"
      />
      <DemoNotice>
        Backend đã có API quản trị CMS. Adapter frontend chưa được kết nối nên nút lưu chỉ giữ bản nháp
        trong phiên trình duyệt và không thay đổi website public.
      </DemoNotice>
      <CmsEditor />
    </>
  );
}
