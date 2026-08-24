import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabaseServer";

type AdminClient = ReturnType<typeof supabaseAdmin>;

async function resolveSenderProfileId(client: AdminClient) {
  const configuredProfileId = process.env.ADMIN_SENDER_PROFILE_ID?.trim();
  if (configuredProfileId) {
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("id", configuredProfileId)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data.id;
  }

  const configuredUserId = process.env.ADMIN_SENDER_USER_ID?.trim();
  if (configuredUserId) {
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("user_id", configuredUserId)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data.id;
  }

  const configuredEmail = process.env.ADMIN_SENDER_EMAIL?.trim();
  if (configuredEmail) {
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("email", configuredEmail)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data.id;
  }

  for (const username of ["crcl", "admin", "support", "crcladmin"]) {
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data.id;
  }

  const { data: created, error: createError } = await client
    .from("profiles")
    .insert({
      username: "crcl",
      full_name: "CRCL",
      email: "support@joinmycrcl.com",
    })
    .select("id")
    .single();

  if (!createError && created?.id) return created.id;

  const { data: fallback, error: fallbackError } = await client
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw fallbackError;
  return fallback?.id ?? null;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const audience = String(form.get("audience") ?? "all");
  const message = String(form.get("message") ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const client = supabaseAdmin();
  const senderProfileId = await resolveSenderProfileId(client);
  if (!senderProfileId) {
    return NextResponse.json(
      { error: "No sender profile is available for broadcast messages." },
      { status: 500 }
    );
  }

  let query = client.from("profiles").select("id").neq("id", senderProfileId).limit(5000);
  if (audience === "creators") {
    query = client.from("profiles").select("id").neq("id", senderProfileId).eq("is_creator", true).limit(5000);
  }
  if (audience === "fans") {
    query = client.from("profiles").select("id").neq("id", senderProfileId).or("is_creator.is.null,is_creator.eq.false").limit(5000);
  }
  let { data, error } = await query;
  if (error && String(error.message ?? "").toLowerCase().includes("is_creator")) {
    const fallback = await client.from("profiles").select("id").neq("id", senderProfileId).limit(5000);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []).map((profile) => ({
    sender_id: senderProfileId,
    receiver_id: profile.id,
    message,
  }));
  if (rows.length) {
    const { error: insertError } = await client.from("messages").insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return new NextResponse(null, { status: 303, headers: { Location: "/broadcast" } });
}
