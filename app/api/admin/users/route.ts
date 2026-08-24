import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabaseServer";

type CreatorStatus = "approved" | "rejected" | "removed";

function applicationStatusForAction(status: CreatorStatus) {
  if (status === "removed") return "removed";
  return status;
}

function fallbackUsername(email: string | undefined, userId: string) {
  const prefix = String(email ?? "").split("@")[0]?.replace(/[^a-z0-9_]/gi, "").toLowerCase();
  return prefix || `user_${userId.slice(0, 8)}`;
}

function isMissingProfileColumn(message: string | undefined) {
  return String(message ?? "").toLowerCase().includes("is_creator");
}

async function updateCreatorStatus(userId: string, isCreator: boolean, status: CreatorStatus) {
  const client = supabaseAdmin();
  const { data, error: getError } = await client.auth.admin.getUserById(userId);
  if (getError || !data.user) return getError?.message || "User not found";

  const applicationStatus = applicationStatusForAction(status);
  const application = data.user.user_metadata?.creator_application ?? {};
  const metadata: Record<string, any> = {
    ...(data.user.user_metadata ?? {}),
    is_creator: isCreator,
    isCreator,
    creator_application_status: applicationStatus,
  };

  if (metadata.creator_application) {
    metadata.creator_application = {
      ...metadata.creator_application,
      status: applicationStatus,
      reviewed_at: new Date().toISOString(),
    };
  }

  const { error: authError } = await client.auth.admin.updateUserById(userId, { user_metadata: metadata });
  if (authError) return authError.message;

  const { data: profile, error: lookupError } = await client
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) return lookupError.message;

  if (profile?.id) {
    const { error: profileError } = await client
      .from("profiles")
      .update({ is_creator: isCreator })
      .eq("id", profile.id);
    if (profileError && !isMissingProfileColumn(profileError.message)) return profileError.message;
    return null;
  }

  const handle = String(application?.handle ?? application?.username ?? "").replace(/^@+/, "").trim();
  const fullName = String(application?.full_name ?? application?.name ?? "").trim();
  const bio = String(application?.bio ?? "").trim();

  const profileInsert = {
    user_id: userId,
    email: data.user.email ?? null,
    username: handle || fallbackUsername(data.user.email, userId),
    full_name: fullName || null,
    bio: bio || null,
    is_creator: isCreator,
  };

  let { error: insertError } = await client.from("profiles").insert(profileInsert);
  if (insertError && isMissingProfileColumn(insertError.message)) {
    const { is_creator, ...profileInsertWithoutCreatorColumn } = profileInsert;
    const retry = await client.from("profiles").insert(profileInsertWithoutCreatorColumn);
    insertError = retry.error;
  }

  return insertError?.message ?? null;
}

export async function PATCH(request: NextRequest) {
  const { userId, profileId, action } = await request.json();
  if (!userId || !action) return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
  const client = supabaseAdmin();
  const knownActions = new Set(["promote", "approveApplication", "demote", "rejectApplication", "suspend", "restore"]);
  if (!knownActions.has(action)) return NextResponse.json({ error: "Unknown admin action" }, { status: 400 });

  if (action === "promote" || action === "approveApplication") {
    const error = await updateCreatorStatus(userId, true, "approved");
    if (error) return NextResponse.json({ error }, { status: 500 });
  }
  if (action === "demote") {
    const error = await updateCreatorStatus(userId, false, "removed");
    if (error) return NextResponse.json({ error }, { status: 500 });
  }
  if (action === "rejectApplication") {
    const error = await updateCreatorStatus(userId, false, "rejected");
    if (error) return NextResponse.json({ error }, { status: 500 });
  }
  if (action === "suspend") {
    const { error: profileError } = await client.from("profiles").update({ is_suspended: true }).eq("user_id", userId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    const { error } = await client.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (action === "restore") {
    const { error: profileError } = await client.from("profiles").update({ is_suspended: false }).eq("user_id", userId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
    const { error } = await client.auth.admin.updateUserById(userId, { ban_duration: "none" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { userId, profileId } = await request.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (profileId) {
    const { error: profileError } = await supabaseAdmin().from("profiles").delete().eq("id", profileId);
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  const { error } = await supabaseAdmin().auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
