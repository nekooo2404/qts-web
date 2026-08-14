import type { Metadata } from "next";

import { GlobalContractManagement } from "@/components/contracts/global-contract-management";
import { DemoNotice } from "@/components/portal/demo-notice";
import { PageHeader } from "@/components/portal/page-header";
import { CONTRACT_DEPARTMENTS, DEMO_CONTRACTS } from "@/lib/demo/contracts";

export const metadata: Metadata = {
  title: "Quản lý hợp đồng toàn công ty",
};

export default function AdminContractsPage() {
  return (
    <>
      <PageHeader
        description="Tra cứu, đối chiếu trạng thái và theo dõi thời hạn hợp đồng giữa các đơn vị trong một danh sách tập trung."
        title="Quản lý hợp đồng toàn công ty"
      />
      <DemoNotice>
        Backend đã có API hợp đồng và phân quyền. Màn hình này chưa nối API nên đang dùng fixture; bộ lọc
        và tệp xuất hoạt động cục bộ.
      </DemoNotice>
      <GlobalContractManagement contracts={DEMO_CONTRACTS} departments={CONTRACT_DEPARTMENTS} />
    </>
  );
}
