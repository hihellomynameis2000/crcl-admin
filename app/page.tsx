import KpiCard from "../src/components/admin/KpiCard";
import PageTitle from "../src/components/admin/PageTitle";
import { compact, currency, getDashboard } from "../src/lib/adminData";

export default async function DashboardPage() {
  const data = await getDashboard();
  return (
    <div>
      <PageTitle title="CRCL Admin" subtitle="Platform control center for users, creators, content, live streams, finance, and oversight." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Gross platform volume" value={currency(data.finance.grossCents)} detail="Unlocks, tips, and active subscriptions" />
        <KpiCard label="CRCL earnings" value={currency(data.finance.crclEarningsCents)} detail={String(Math.round(data.finance.platformFeeRate * 100)) + "% platform fee"} />
        <KpiCard label="Users" value={compact(data.authUsers || data.profiles)} detail={compact(data.creators) + " creators"} />
        <KpiCard label="Live now" value={compact(data.activeLives)} detail={compact(data.lives) + " total streams"} />
        <KpiCard label="Posts" value={compact(data.posts)} />
        <KpiCard label="Active subscriptions" value={compact(data.subscriptions)} />
        <KpiCard label="Follows" value={compact(data.follows)} />
        <KpiCard label="Messages" value={compact(data.messages)} />
      </div>
    </div>
  );
}
