import type { Metadata } from "next";

import { ContractBuilder } from "@/components/contracts/contract-builder";
import { DemoNotice } from "@/components/portal/demo-notice";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = {
  title: "Tạo hợp đồng",
};

export default function NewContractPage() {
  return (
    <>
      <PageHeader
        description="Nhập thông tin, kiểm tra bản xem trước và xuất tài liệu Word theo biểu mẫu hợp đồng nội bộ."
        title="Smart Contract Builder"
      />
      <DemoNotice>
        Backend đã có endpoint sinh DOCX từ template riêng tư. Bản frontend này chưa nối endpoint nên tạo
        tài liệu cục bộ, chưa lưu hợp đồng và không thay thế bước rà soát pháp chế.
      </DemoNotice>
      <ContractBuilder />
    </>
  );
}
