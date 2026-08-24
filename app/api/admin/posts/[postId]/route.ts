import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../src/lib/supabaseServer";

export async function DELETE(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const client = supabaseAdmin();
  await Promise.all([
    client.from("post_comments").delete().eq("post_id", postId),
    client.from("post_likes").delete().eq("post_id", postId),
    client.from("post_media").delete().eq("post_id", postId),
  ]);
  const { error } = await client.from("posts").delete().eq("id", postId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
