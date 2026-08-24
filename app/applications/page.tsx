import AdminButton from "../../src/components/admin/AdminButton";
import PageTitle from "../../src/components/admin/PageTitle";
import { getApplications } from "../../src/lib/adminData";

export default async function ApplicationsPage() {
  const applications = await getApplications();
  return (
    <div>
      <PageTitle title="Creator Applications" subtitle="Review pending creator submissions." />
      <div className="space-y-4">
        {applications.length ? (
          applications.map(({ user, application }: any) => (
            <div key={user.id} className="rounded-lg border border-black/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-black">{application?.full_name || application?.name || user.email || user.id}</div>
                  <div className="text-sm font-medium text-black/50">
                    {user.email} · {application?.status || "submitted"} · submitted{" "}
                    {application?.submittedAt ? new Date(application.submittedAt).toLocaleString() : "unknown"}
                  </div>
                </div>
                <div className="space-x-2">
                  <AdminButton label="Approve" endpoint="/api/admin/users" method="PATCH" body={{ userId: user.id, action: "approveApplication" }} />
                  <AdminButton label="Reject" endpoint="/api/admin/users" method="PATCH" body={{ userId: user.id, action: "rejectApplication" }} tone="danger" confirmText="Reject this creator application?" />
                </div>
              </div>
              <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-black/[0.03] p-3 text-xs text-black/65">{JSON.stringify(application, null, 2)}</pre>
            </div>
          ))
        ) : (
          <div className="admin-panel rounded-md p-5 text-sm font-medium text-black/50">No pending creator applications.</div>
        )}
      </div>
    </div>
  );
}
