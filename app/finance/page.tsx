import PageTitle from "../../src/components/admin/PageTitle";
import FinanceLivePanel from "../../src/components/admin/FinanceLivePanel";
import { getFinanceSummary, getTransactionLogs, getWithdrawalQueueSnapshot } from "../../src/lib/adminData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FinancePage() {
  const [finance, transactions, withdrawalSnapshot] = await Promise.all([
    getFinanceSummary(),
    getTransactionLogs(),
    getWithdrawalQueueSnapshot(),
  ]);
  return (
    <div className="space-y-6">
      <PageTitle title="Finance" subtitle="Revenue, platform earnings, creator payout exposure, and recent transaction activity." />
      <FinanceLivePanel
        initialData={{
          finance,
          transactions,
          withdrawals: withdrawalSnapshot.withdrawals,
          tenantBalance: withdrawalSnapshot.tenantBalance,
        }}
      />
    </div>
  );
}
