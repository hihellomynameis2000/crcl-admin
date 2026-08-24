import PageTitle from "../../src/components/admin/PageTitle";
import AdminButton from "../../src/components/admin/AdminButton";
import KpiCard from "../../src/components/admin/KpiCard";
import { canReviewWithdrawal, currency, getWithdrawalQueueSnapshot } from "../../src/lib/adminData";

export default async function WithdrawalsPage() {
  const { withdrawals, tenantBalance } = await getWithdrawalQueueSnapshot();

  return (
    <div className="space-y-5">
      <PageTitle
        title="Withdrawal Requests"
        subtitle="Buildrbrand ledger payout queue for CRCL creator withdrawals."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="CRCL ledger available"
          value={currency(Number(tenantBalance?.availableCents ?? 0))}
          detail={tenantBalance?.error || `${tenantBalance?.walletCount ?? 0} CRCL balance wallet${tenantBalance?.walletCount === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="CRCL ledger pending"
          value={currency(Number(tenantBalance?.pendingCents ?? 0))}
          detail="Tenant scoped, not total platform balance"
        />
        <KpiCard
          label="CRCL ledger reserved"
          value={currency(Number(tenantBalance?.reservedCents ?? 0))}
          detail="Held for active or pending payout flows"
        />
      </div>
      <div className="admin-panel overflow-x-auto rounded-md">
        <table className="admin-table w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr>
              <th className="p-3">Request</th>
              <th className="p-3">Status</th>
              <th className="p-3">Rail</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Created</th>
              <th className="p-3">Updated</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length ? (
              withdrawals.map((withdrawal: any) => {
                const reviewable = canReviewWithdrawal(withdrawal);
                return (
                  <tr key={withdrawal.id}>
                    <td className="max-w-xs truncate p-3 font-semibold">{withdrawal.id}</td>
                    <td className="p-3">{withdrawal.status || "requested"}</td>
                    <td className="p-3">{withdrawal.rail || "-"}</td>
                    <td className="max-w-xs truncate p-3 text-black/55">
                      {withdrawal.destination_connected_account_id || withdrawal.wallet_id || "-"}
                    </td>
                    <td className="p-3">
                      {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="p-3">
                      {withdrawal.updated_at ? new Date(withdrawal.updated_at).toLocaleString() : "-"}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {currency(Math.round(Number(withdrawal.amount || 0) * 100))}
                    </td>
                    <td className="p-3">
                      {reviewable ? (
                        <div className="flex justify-end gap-2">
                          <AdminButton
                            label="Approve"
                            endpoint="/api/admin/withdrawals"
                            method="PATCH"
                            body={{ withdrawalId: withdrawal.id, action: "approve" }}
                            confirmText="Approve this withdrawal request?"
                          />
                          <AdminButton
                            label="Deny"
                            endpoint="/api/admin/withdrawals"
                            method="PATCH"
                            body={{ withdrawalId: withdrawal.id, action: "deny" }}
                            tone="danger"
                            confirmText="Deny this withdrawal request and release reserved funds?"
                          />
                        </div>
                      ) : (
                        <div className="text-right text-xs font-semibold text-black/35">-</div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-5 text-black/50" colSpan={8}>
                  No withdrawal requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
