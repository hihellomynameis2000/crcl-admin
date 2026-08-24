import KpiCard from "../../src/components/admin/KpiCard";
import PageTitle from "../../src/components/admin/PageTitle";
import { getFinanceSummary } from "../../src/lib/adminData";

export default async function SettingsPage() {
  const finance = await getFinanceSummary();
  const buildrbrandConfigured = Boolean(process.env.BUILDRBRAND_API_URL && process.env.BUILDRBRAND_INTERNAL_API_KEY);

  return (
    <div>
      <PageTitle
        title="Platform Settings"
        subtitle="Fees, payout controls, and platform configuration."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Platform fee"
          value={`${Math.round(finance.platformFeeRate * 100)}%`}
          detail={finance.feeSource}
        />
        <KpiCard
          label="Payout service"
          value={buildrbrandConfigured ? "Connected" : "Missing"}
          detail={process.env.BUILDRBRAND_TENANT_SLUG || "crcl"}
        />
        <KpiCard
          label="Token rate"
          value={`${process.env.CRCL_TOKENS_PER_DOLLAR || "100"} / $1`}
          detail="Used for CRCL ledger reporting"
        />
        <KpiCard
          label="Merchant fee"
          value={`${Math.round(finance.merchantFeeRate * 100)}%`}
          detail="Processor/merchant reserve"
        />
      </div>
    </div>
  );
}
