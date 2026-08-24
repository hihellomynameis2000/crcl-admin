import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../src/lib/supabaseServer";

export async function POST(_request: Request, { params }: { params: Promise<{ liveStreamId: string }> }) {
  const { liveStreamId } = await params;
  const { error } = await supabaseAdmin().from("live_streams").update({ status: "ended", ended_at: new Date().toISOString(), is_live: false }).eq("id", liveStreamId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
