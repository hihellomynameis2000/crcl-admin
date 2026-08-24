import PageTitle from "../../src/components/admin/PageTitle";

export default function BroadcastPage() {
  return <div><PageTitle title="Broadcast DM" subtitle="Send an admin message to all users, creators, or fans." /><form action="/api/admin/broadcast" method="post" className="max-w-2xl rounded-lg border border-black/10 bg-white p-5"><label className="text-sm font-bold">Audience</label><select name="audience" className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 text-sm"><option value="all">All users</option><option value="creators">Creators</option><option value="fans">Fans only</option></select><label className="mt-4 block text-sm font-bold">Message</label><textarea name="message" rows={7} className="mt-2 w-full rounded-md border border-black/10 px-3 py-2 text-sm" placeholder="Type the platform announcement..." /><button className="mt-4 rounded-md bg-black px-4 py-2 text-sm font-bold text-white">Send broadcast</button></form></div>;
}
