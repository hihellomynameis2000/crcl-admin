"use client";

import { useEffect, useMemo, useState } from "react";
import AdminButton from "./AdminButton";
import KpiCard from "./KpiCard";
import { canReviewWithdrawal, currency, type TenantBalanceSummary } from "../../lib/adminData";

type FinancePayload = {
  checkedAt?: string;
  finance: Record<string, any>;
  transactions: Record<string, any>[];
  withdrawals: Record<string, any>[];
  tenantBalance?: TenantBalanceSummary | null;
};

const hiddenStatuses = new Set(["sandbox_archived", "archived", "deleted", "void"]);

function visibleLedgerRow(row: Record<string, any>) {
  const status = String(row.status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return !(
    hiddenStatuses.has(status) ||
    row.sandbox_archived === true ||
    row.sandboxArchived === true ||
    row.archived_at ||
    row.archivedAt ||
    row.deleted_at ||
    row.deletedAt
  );
}

function cents(row: Record<string, any>) {
  const normalized = Number(row.amountCents ?? row.amount_cents);
  if (Number.isFinite(normalized)) return normalized;
  const dollars = Number(row.amount || 0);
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : 0;
}

function createdAt(row: Record<string, any>) {
  return row.createdAt || row.created_at || row.requestedAt || null;
}

export default function FinanceLivePanel({ initialData }: { initialData: FinancePayload }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/admin/finance", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as FinancePayload;
      if (!cancelled) setData(payload);
    }

    const timer = window.setInterval(load, 10000);
    void load();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const finance = data.finance ?? {};
  const transactions = (data.transactions ?? []).filter(visibleLedgerRow);
  const withdrawals = (data.withdrawals ?? []).filter(visibleLedgerRow);
  const tenantBalance = data.tenantBalance ?? null;
  const lastUpdated = useMemo(
    () => (data.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : "live"),
    [data.checkedAt]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Gross volume" value={currency(finance.purchaseGrossCents ?? finance.grossCents ?? 0)} detail={`Updated ${lastUpdated}`} />
        <KpiCard label="Platform earnings" value={currency(finance.crclEarningsCents ?? ((finance.platformFeeCents || 0) + (finance.merchantFeeCents || 0)))} detail={String(Math.round((finance.platformFeeRate || 0) * 100)) + "% platform fee · " + (finance.feeSource || "Buildrbrand ledger")} />
        <KpiCard label="Buildrbrand merchant fee" value={currency(finance.merchantFeeCents || 0)} detail={String(Math.round((finance.merchantFeeRate || 0) * 100)) + "% configured fee"} />
        <KpiCard label="Creator net" value={currency(finance.creatorNetCents || 0)} />
        <KpiCard label="Subscriptions" value={currency(finance.subscriptionCents || 0)} />
        <KpiCard label="Post unlocks" value={currency(finance.unlockCents || 0)} />
        <KpiCard label="Post tips" value={currency(finance.postTipCents || 0)} />
        <KpiCard label="Live tips" value={currency(finance.liveTipCents || 0)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="CRCL ledger available"
          value={currency(Number(finance.walletAvailableCents ?? tenantBalance?.availableCents ?? 0))}
          detail={tenantBalance?.error || `${finance.walletCount ?? tenantBalance?.walletCount ?? 0} tenant balance wallet${(finance.walletCount ?? tenantBalance?.walletCount) === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="CRCL ledger pending"
          value={currency(Number(finance.walletPendingCents ?? tenantBalance?.pendingCents ?? 0))}
          detail="Tenant scoped, not total platform balance"
        />
        <KpiCard
          label="CRCL ledger reserved"
          value={currency(Number(finance.walletReservedCents ?? tenantBalance?.reservedCents ?? 0))}
          detail="Held for active or pending flows"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Withdrawal requests" value={currency(finance.withdrawalRequestCents || 0)} detail={`${finance.withdrawalRequestCount ?? withdrawals.length} non-archived rows`} />
        <KpiCard label="Active withdrawals" value={currency(finance.activeWithdrawalCents || 0)} detail={`${finance.activeWithdrawalCount || 0} requested, pending, or processing`} />
        <KpiCard label="Paid withdrawals" value={currency(finance.paidWithdrawalCents || 0)} detail={`${finance.paidWithdrawalCount || 0} completed`} />
        <KpiCard label="Failed withdrawals" value={currency(finance.failedWithdrawalCents || 0)} detail={`${finance.failedWithdrawalCount || 0} failed, rejected, or cancelled`} />
      </div>

      <div className="admin-panel overflow-x-auto rounded-md">
        <div className="border-b border-black/10 p-4">
          <h2 className="text-lg font-black">Transaction logs</h2>
          <p className="text-sm font-medium text-black/50">Recent Buildrbrand ledger activity and CRCL payment records.</p>
        </div>
        <table className="admin-table w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reference</th>
              <th className="p-3">Created</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length ? transactions.map((transaction: any) => (
              <tr key={(transaction.type || "tx") + transaction.id}>
                <td className="p-3 font-semibold">{transaction.type || transaction.source || "Ledger activity"}</td>
                <td className="p-3">{transaction.status || "posted"}</td>
                <td className="max-w-sm truncate p-3 text-black/55">{transaction.reference || transaction.id}</td>
                <td className="p-3">{createdAt(transaction) ? new Date(createdAt(transaction)).toLocaleString() : "-"}</td>
                <td className="p-3 text-right font-semibold">{currency(cents(transaction))}</td>
              </tr>
            )) : (
              <tr>
                <td className="p-4 text-sm font-medium text-black/45" colSpan={5}>No transaction logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-panel overflow-x-auto rounded-md">
        <div className="border-b border-black/10 p-4">
          <h2 className="text-lg font-black">Withdrawal requests</h2>
          <p className="text-sm font-medium text-black/50">Creator withdrawal queue and payout status.</p>
        </div>
        <table className="admin-table w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr>
              <th className="p-3">Request</th>
              <th className="p-3">Status</th>
              <th className="p-3">Rail</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Created</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.length ? withdrawals.map((withdrawal: any) => {
              const reviewable = canReviewWithdrawal(withdrawal);
              return (
                <tr key={withdrawal.id}>
                  <td className="max-w-xs truncate p-3 font-semibold">{withdrawal.id}</td>
                  <td className="p-3">{withdrawal.status || "requested"}</td>
                  <td className="p-3">{withdrawal.rail || "-"}</td>
                  <td className="max-w-xs truncate p-3 text-black/55">{withdrawal.destination_connected_account_id || withdrawal.destination || withdrawal.wallet_id || withdrawal.walletId || "-"}</td>
                  <td className="p-3">{createdAt(withdrawal) ? new Date(createdAt(withdrawal)).toLocaleString() : "-"}</td>
                  <td className="p-3 text-right font-semibold">{currency(cents(withdrawal))}</td>
                  <td className="p-3">
                    {reviewable ? (
                      <div className="flex justify-end gap-2">
                        <AdminButton label="Approve" endpoint="/api/admin/withdrawals" method="PATCH" body={{ withdrawalId: withdrawal.id, action: "approve" }} confirmText="Approve this withdrawal request?" />
                        <AdminButton label="Deny" endpoint="/api/admin/withdrawals" method="PATCH" body={{ withdrawalId: withdrawal.id, action: "deny" }} tone="danger" confirmText="Deny this withdrawal request and release reserved funds?" />
                      </div>
                    ) : (
                      <div className="text-right text-xs font-semibold text-black/35">-</div>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td className="p-4 text-sm font-medium text-black/45" colSpan={7}>No withdrawal requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
