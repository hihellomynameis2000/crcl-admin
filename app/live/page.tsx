import AdminButton from "../../src/components/admin/AdminButton";
import PageTitle from "../../src/components/admin/PageTitle";
import { getLiveStreams } from "../../src/lib/adminData";

export default async function LivePage() {
  const streams = await getLiveStreams();
  return <div><PageTitle title="Live" subtitle="Recent stream summary from live_streams. Use force end to clear stuck live state." /><div className="admin-panel overflow-x-auto rounded-md"><table className="admin-table w-full min-w-[900px] text-left text-sm"><thead ><tr><th className="p-3">Stream</th><th className="p-3">Creator</th><th className="p-3">State</th><th className="p-3">Viewers</th><th className="p-3">Started</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{streams.map((stream: any) => <tr key={stream.id} ><td className="p-3 font-semibold">{stream.title || stream.caption || "Live stream"}<div className="text-xs text-black/45">{stream.id}</div></td><td className="p-3">@{stream.creator?.username || "unknown"}</td><td className="p-3">{stream.is_live ? "Live" : stream.status || "Ended"}</td><td className="p-3">{stream.viewers ?? 0}</td><td className="p-3">{stream.started_at || stream.created_at ? new Date(stream.started_at || stream.created_at).toLocaleString() : "-"}</td><td className="p-3 text-right">{stream.is_live ? <AdminButton label="End live" endpoint={"/api/admin/live/" + stream.id} method="POST" tone="danger" confirmText="Force end this live stream?" /> : null}</td></tr>)}</tbody></table></div></div>;
}
