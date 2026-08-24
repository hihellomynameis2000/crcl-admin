import PageTitle from "../../../src/components/admin/PageTitle";
import { getDashboard } from "../../../src/lib/adminData";

export default async function SystemLogsPage() {
  const data = await getDashboard();
  return <div><PageTitle title="System Logs" subtitle="Current operational snapshot. Buildrbrand API hooks can be layered here when the CRCL tenant endpoint is live." /><div className="rounded-lg border border-black/10 bg-white p-5"><pre className="overflow-auto text-xs text-black/65">{JSON.stringify({ checkedAt: new Date().toISOString(), data }, null, 2)}</pre></div></div>;
}
