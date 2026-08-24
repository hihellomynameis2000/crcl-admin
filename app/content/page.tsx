import AdminButton from "../../src/components/admin/AdminButton";
import PageTitle from "../../src/components/admin/PageTitle";
import { currency, getPosts } from "../../src/lib/adminData";

export default async function ContentPage() {
  const posts = await getPosts();
  return <div><PageTitle title="Content" subtitle="Moderate posts and remove policy-breaking content." /><div className="overflow-hidden rounded-lg border border-black/10 bg-white"><table className="w-full text-left text-sm"><thead ><tr><th className="p-3">Post</th><th className="p-3">Creator</th><th className="p-3">Gate</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{posts.map((post: any) => <tr key={post.id} ><td className="max-w-lg p-3"><div className="truncate font-semibold">{post.caption || "Untitled post"}</div><div className="text-xs text-black/45">{post.id}</div></td><td className="p-3">@{post.creator?.username || "unknown"}</td><td className="p-3">{post.is_gated ? ((post.gating_mode || "paid") + " " + (post.unlock_price_cents ? currency(post.unlock_price_cents) : "")) : "Free"}</td><td className="p-3">{post.created_at ? new Date(post.created_at).toLocaleDateString() : "-"}</td><td className="p-3 text-right"><AdminButton label="Delete" endpoint={"/api/admin/posts/" + post.id} method="DELETE" tone="danger" confirmText="Delete this post and related media/comments?" /></td></tr>)}</tbody></table></div></div>;
}
