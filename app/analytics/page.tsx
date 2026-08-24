import KpiCard from "../../src/components/admin/KpiCard";
import PageTitle from "../../src/components/admin/PageTitle";
import { compact, getDashboard } from "../../src/lib/adminData";

export default async function AnalyticsPage() {
  const data = await getDashboard();
  return (
    <div>
      <PageTitle title="Analytics" subtitle="Operational CRCL metrics pulled directly from Supabase." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Auth users" value={compact(data.authUsers)} />
        <KpiCard label="Profiles" value={compact(data.profiles)} />
        <KpiCard label="Creators" value={compact(data.creators)} />
        <KpiCard label="Posts" value={compact(data.posts)} />
        <KpiCard label="Total streams" value={compact(data.lives)} />
        <KpiCard label="Active streams" value={compact(data.activeLives)} />
        <KpiCard label="Active subscriptions" value={compact(data.subscriptions)} />
        <KpiCard label="Messages" value={compact(data.messages)} />
      </div>
    </div>
  );
}
