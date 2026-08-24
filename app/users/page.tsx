import AdminButton from "../../src/components/admin/AdminButton";
import PageTitle from "../../src/components/admin/PageTitle";
import { getUsers } from "../../src/lib/adminData";

export default async function UsersPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const users = await getUsers(params?.q ?? "");
  return (
    <div>
      <PageTitle title="Users" subtitle="Search, suspend, restore, delete, and promote accounts using CRCL profiles plus Supabase auth metadata." />
      <form className="mb-4 flex max-w-xl gap-2">
        <input name="q" defaultValue={params?.q ?? ""} placeholder="Search username, name, or email" className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm" />
        <button className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white">Search</button>
      </form>
      <div className="admin-panel overflow-x-auto rounded-md">
        <table className="admin-table w-full min-w-[940px] text-left text-sm">
          <thead ><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Risk</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>
            {users.map(({ profile, auth, isCreator, isSuspended }: any) => <tr key={profile.id} ><td className="p-3 font-semibold">{profile.full_name || profile.username || profile.email || auth?.email || profile.id}<div className="text-xs font-medium text-black/45">@{profile.username || "unknown"} · {profile.email || auth?.email || "no email"}</div></td><td className="p-3">{isCreator ? "Creator" : "Fan"}</td><td className="p-3">{isSuspended ? "Suspended" : "Active"}{profile.is_shadow_banned ? " / Shadow" : ""}</td><td className="p-3">{profile.risk_score ?? 0}</td><td className="p-3">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}</td><td className="space-x-2 p-3 text-right"><AdminButton label={isCreator ? "Demote" : "Creator"} endpoint="/api/admin/users" method="PATCH" body={{ userId: profile.user_id, profileId: profile.id, action: isCreator ? "demote" : "promote" }} tone={isCreator ? "danger" : "default"} /><AdminButton label={isSuspended ? "Restore" : "Suspend"} endpoint="/api/admin/users" method="PATCH" body={{ userId: profile.user_id, profileId: profile.id, action: isSuspended ? "restore" : "suspend" }} tone={isSuspended ? "default" : "danger"} confirmText="Confirm account status change?" /><AdminButton label="Delete" endpoint="/api/admin/users" method="DELETE" body={{ userId: profile.user_id, profileId: profile.id }} tone="danger" confirmText="Delete this auth user? This cannot be undone." /></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
