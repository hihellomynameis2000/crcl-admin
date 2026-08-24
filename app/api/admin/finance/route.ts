import { NextResponse } from "next/server";
import { getFinanceSummary, getTransactionLogs, getWithdrawalQueueSnapshot } from "../../../../src/lib/adminData";
import { buildrbrandApi } from "../../../../src/lib/buildrbrandApi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getBuildrbrandFinance() {
  return buildrbrandApi<{
    finance?: Record<string, any>;
    transactions?: Record<string, any>[];
    withdrawalRequests?: Record<string, any>[];
  }>("/api/internal/ledger/finance?limit=500");
}

export async function GET() {
  const buildrbrandFinance = await getBuildrbrandFinance();
  if (buildrbrandFinance?.finance) {
    const directWithdrawals = Array.isArray(buildrbrandFinance.withdrawalRequests)
      ? buildrbrandFinance.withdrawalRequests
      : null;
    const withdrawalSnapshot = directWithdrawals === null
      ? await getWithdrawalQueueSnapshot()
      : {
          withdrawals: directWithdrawals,
          tenantBalance: {
            currency: "usd",
            availableCents: Number(buildrbrandFinance.finance.walletAvailableCents || 0),
            pendingCents: Number(buildrbrandFinance.finance.walletPendingCents || 0),
            reservedCents: Number(buildrbrandFinance.finance.walletReservedCents || 0),
            walletCount: Number(buildrbrandFinance.finance.walletCount || 0),
          },
        };

    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        finance: buildrbrandFinance.finance,
        transactions: buildrbrandFinance.transactions ?? [],
        withdrawals: withdrawalSnapshot.withdrawals,
        tenantBalance: withdrawalSnapshot.tenantBalance,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        },
      }
    );
  }

  const [finance, transactions, withdrawalSnapshot] = await Promise.all([
    getFinanceSummary(),
    getTransactionLogs(),
    getWithdrawalQueueSnapshot(),
  ]);

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      finance,
      transactions,
      withdrawals: withdrawalSnapshot.withdrawals,
      tenantBalance: withdrawalSnapshot.tenantBalance,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      },
    }
  );
}
