import { unstable_noStore as noStore } from "next/cache";
import { TOKENS_PER_DOLLAR, getTenantFeeRates, supabaseAdmin } from "./supabaseServer";
import { buildrbrandApi } from "./buildrbrandApi";

type AnyRow = Record<string, any>;
type AuthUser = { id: string; email?: string | null; created_at?: string; banned_until?: string | null; user_metadata?: Record<string, any> | null };
export type MoneyRow = { amount_cents?: number | null; amount_tokens?: number | null; price_tokens?: number | null; status?: string | null; current_period_end?: string | null };

const activeStatuses = new Set(["active", "paid", "complete", "completed", "succeeded", "unlocked", "posted", "settled", "fulfilled"]);
const badStatuses = new Set(["refunded", "refund", "canceled", "cancelled", "failed", "void", "expired"]);

function isTrue(value: unknown) { return value === true || value === "true" || value === 1 || value === "1"; }
export function isCreatorAuth(user?: AuthUser | null) { return isTrue(user?.user_metadata?.is_creator) || isTrue(user?.user_metadata?.isCreator); }

export function centsFromRow(row: MoneyRow) {
  if (typeof row.amount_cents === "number") return Math.max(0, row.amount_cents);
  const tokens = typeof row.amount_tokens === "number" ? row.amount_tokens : typeof row.price_tokens === "number" ? row.price_tokens : 0;
  return Math.round((Math.max(0, tokens) / TOKENS_PER_DOLLAR) * 100);
}

function numberFrom(value: unknown) {
  const number = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function centsFromDollars(value: unknown) {
  return Math.round(Math.max(0, numberFrom(value)) * 100);
}

export function currency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function compact(value: number) { return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value || 0); }

function emptyFinanceSummary(feeConfig = { platformRate: 0.15, merchantRate: 0, source: "launch baseline" }) {
  return {
    purchaseGrossCents: 0,
    cardTopUpCents: 0,
    unlockCents: 0,
    postTipCents: 0,
    liveTipCents: 0,
    subscriptionCents: 0,
    grossCents: 0,
    platformFeeCents: 0,
    merchantFeeCents: 0,
    crclEarningsCents: 0,
    creatorNetCents: 0,
    walletAvailableCents: 0,
    walletPendingCents: 0,
    walletReservedCents: 0,
    walletCount: 0,
    withdrawalRequestCents: 0,
    activeWithdrawalCents: 0,
    paidWithdrawalCents: 0,
    failedWithdrawalCents: 0,
    withdrawalRequestCount: 0,
    activeWithdrawalCount: 0,
    paidWithdrawalCount: 0,
    failedWithdrawalCount: 0,
    platformFeeRate: feeConfig.platformRate,
    merchantFeeRate: feeConfig.merchantRate,
    feeSource: feeConfig.source,
  };
}

function normalizeFinanceSummary(finance: AnyRow, feeConfig?: { platformRate: number; merchantRate: number; source: string }) {
  const normalized = {
    ...emptyFinanceSummary(feeConfig),
    ...finance,
  };

  normalized.grossCents = numberFrom(normalized.grossCents);
  normalized.platformFeeCents = numberFrom(normalized.platformFeeCents);
  normalized.merchantFeeCents = numberFrom(normalized.merchantFeeCents);
  normalized.crclEarningsCents = numberFrom(normalized.crclEarningsCents);
  if (!normalized.crclEarningsCents) {
    normalized.crclEarningsCents = normalized.platformFeeCents + normalized.merchantFeeCents;
  }
  normalized.creatorNetCents = numberFrom(normalized.creatorNetCents);
  normalized.unlockCents = numberFrom(normalized.unlockCents);
  normalized.postTipCents = numberFrom(normalized.postTipCents);
  normalized.liveTipCents = numberFrom(normalized.liveTipCents);
  normalized.subscriptionCents = numberFrom(normalized.subscriptionCents);
  normalized.platformFeeRate = numberFrom(normalized.platformFeeRate || feeConfig?.platformRate);
  normalized.merchantFeeRate = numberFrom(normalized.merchantFeeRate || feeConfig?.merchantRate);
  normalized.feeSource = normalized.feeSource || feeConfig?.source || "Buildrbrand ledger";

  return normalized;
}

function hasFinanceActivity(finance?: ReturnType<typeof normalizeFinanceSummary> | null) {
  if (!finance) return false;
  return [
    finance.grossCents,
    finance.platformFeeCents,
    finance.merchantFeeCents,
    finance.creatorNetCents,
    finance.subscriptionCents,
    finance.unlockCents,
    finance.postTipCents,
    finance.liveTipCents,
  ].some((value) => numberFrom(value) > 0);
}

function statusText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

const hiddenLedgerStatuses = new Set(["sandbox_archived", "archived", "deleted", "void"]);

function isVisibleLedgerRow(row: AnyRow) {
  const metadata = row?.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const status = statusText(row?.status || metadata.status).replace(/[\s-]+/g, "_");
  return !(
    hiddenLedgerStatuses.has(status) ||
    row?.sandbox_archived === true ||
    row?.sandboxArchived === true ||
    metadata.sandbox_archived === true ||
    row?.archived_at ||
    row?.archivedAt ||
    row?.deleted_at ||
    row?.deletedAt ||
    metadata.archived_at ||
    metadata.deleted_at
  );
}

function normalizeWithdrawalRow(row: AnyRow) {
  const amountCents = numberFrom(row.amountCents ?? row.amount_cents);
  return {
    ...row,
    amount_cents: amountCents || centsFromDollars(row.amount),
    amount: row.amount ?? amountCents / 100,
    wallet_id: row.wallet_id || row.walletId || null,
    destination_connected_account_id:
      row.destination_connected_account_id || row.destination || null,
    created_at: row.created_at || row.createdAt || row.requestedAt || null,
    updated_at: row.updated_at || row.updatedAt || null,
  };
}

function isBadStatus(status: string) {
  return (
    badStatuses.has(status) ||
    status.includes("refund") ||
    status.includes("cancel") ||
    status.includes("fail") ||
    status === "void"
  );
}

function isRevenueRow(row: AnyRow, statusKeys = ["status"], countMissingStatus = false) {
  const statuses = statusKeys.map((key) => statusText(row[key])).filter(Boolean);
  if (!statuses.length) return countMissingStatus;
  if (statuses.some(isBadStatus)) return false;
  return statuses.some((status) => activeStatuses.has(status));
}

function addMoneyRows(rows: AnyRow[]) {
  return rows.reduce((sum, row) => sum + centsFromRow(row), 0);
}

async function getLocalCrclFinanceSummary(feeConfig: { platformRate: number; merchantRate: number; source: string }) {
  const [orders, subscriptions, postUnlocks, postTips, liveTips] = await Promise.all([
    rows<AnyRow>(
      "orders",
      "id,total_amount_tokens,total_amount_cents,status,payment_status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(5000)
    ),
    rows<AnyRow>(
      "subscriptions",
      "id,price_tokens,amount_tokens,amount_cents,status,current_period_start,current_period_end,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(5000)
    ),
    rows<AnyRow>(
      "post_unlocks",
      "id,price_tokens,amount_tokens,amount_cents,status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(5000)
    ),
    rows<AnyRow>(
      "post_tips",
      "id,amount_tokens,amount_cents,status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(5000)
    ),
    rows<AnyRow>(
      "live_tips",
      "id,amount_tokens,amount_cents,status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(5000)
    ),
  ]);

  const paidOrders = orders.filter((row) => isRevenueRow(row, ["payment_status", "status"]));
  const activeSubscriptions = subscriptions.filter((row) => isRevenueRow(row, ["status"]));
  const settledUnlocks = postUnlocks.filter((row) => isRevenueRow(row, ["status"], true));
  const settledPostTips = postTips.filter((row) => isRevenueRow(row, ["status"], true));
  const settledLiveTips = liveTips.filter((row) => isRevenueRow(row, ["status"], true));

  const orderCents = paidOrders.reduce(
    (sum, row) =>
      sum +
      centsFromRow({
        amount_cents: row.total_amount_cents,
        amount_tokens: row.total_amount_tokens,
        status: row.status,
      }),
    0
  );
  const subscriptionCents = addMoneyRows(activeSubscriptions);
  const unlockCents = addMoneyRows(settledUnlocks);
  const postTipCents = addMoneyRows(settledPostTips);
  const liveTipCents = addMoneyRows(settledLiveTips);
  const grossCents = orderCents + subscriptionCents + unlockCents + postTipCents + liveTipCents;

  if (!grossCents) return null;

  const platformFeeCents = Math.round(grossCents * Math.max(0, feeConfig.platformRate));
  const merchantFeeCents = Math.round(grossCents * Math.max(0, feeConfig.merchantRate));

  return {
    ...emptyFinanceSummary(feeConfig),
    unlockCents,
    postTipCents,
    liveTipCents,
    subscriptionCents,
    grossCents,
    platformFeeCents,
    merchantFeeCents,
    crclEarningsCents: platformFeeCents + merchantFeeCents,
    creatorNetCents: Math.max(0, grossCents - platformFeeCents - merchantFeeCents),
    platformFeeRate: feeConfig.platformRate,
    merchantFeeRate: feeConfig.merchantRate,
    feeSource: `${feeConfig.source} · local CRCL activity fallback`,
  };
}

function localTransactionRow(row: AnyRow, type: string, amountCents: number) {
  return {
    ...row,
    id: row.id,
    type,
    status: row.payment_status || row.status || "posted",
    amount_cents: amountCents,
    currency: "usd",
    created_at: row.created_at || row.current_period_start,
  };
}

async function getLocalCrclTransactionLogs() {
  const [orders, subscriptions, postUnlocks, postTips, liveTips] = await Promise.all([
    rows<AnyRow>(
      "orders",
      "id,total_amount_tokens,total_amount_cents,status,payment_status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(100)
    ),
    rows<AnyRow>(
      "subscriptions",
      "id,price_tokens,amount_tokens,amount_cents,status,current_period_start,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(100)
    ),
    rows<AnyRow>(
      "post_unlocks",
      "id,price_tokens,amount_tokens,amount_cents,status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(100)
    ),
    rows<AnyRow>(
      "post_tips",
      "id,amount_tokens,amount_cents,status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(100)
    ),
    rows<AnyRow>(
      "live_tips",
      "id,amount_tokens,amount_cents,status,created_at",
      (q) => q.order("created_at", { ascending: false }).limit(100)
    ),
  ]);

  return [
    ...orders.map((row) =>
      localTransactionRow(
        row,
        "Shop order",
        centsFromRow({ amount_cents: row.total_amount_cents, amount_tokens: row.total_amount_tokens })
      )
    ),
    ...subscriptions.map((row) => localTransactionRow(row, "Subscription", centsFromRow(row))),
    ...postUnlocks.map((row) => localTransactionRow(row, "Post unlock", centsFromRow(row))),
    ...postTips.map((row) => localTransactionRow(row, "Post tip", centsFromRow(row))),
    ...liveTips.map((row) => localTransactionRow(row, "Live tip", centsFromRow(row))),
  ]
    .filter((row) => numberFrom(row.amount_cents) > 0)
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 100);
}

export function canReviewWithdrawal(withdrawal: AnyRow) {
  const status = String(withdrawal.status || "requested").toLowerCase();
  const hasProcessedMarker = Boolean(
    withdrawal.approved_at ||
      withdrawal.denied_at ||
      withdrawal.completed_at ||
      withdrawal.processed_at ||
      withdrawal.paid_at ||
      withdrawal.payout_id ||
      withdrawal.transfer_id
  );

  return !hasProcessedMarker && (status === "requested" || status === "pending" || status === "submitted");
}

export type TenantBalanceSummary = {
  currency?: string | null;
  availableCents?: number | null;
  pendingCents?: number | null;
  reservedCents?: number | null;
  walletCount?: number | null;
  error?: string | null;
};

async function count(table: string, apply?: (q: any) => any) {
  try {
    const client = supabaseAdmin();
    let query = client.from(table).select("*", { count: "exact", head: true });
    if (apply) query = apply(query);
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch (error) {
    console.warn(`Admin count failed for ${table}:`, error instanceof Error ? error.message : error);
    return 0;
  }
}

async function rows<T = AnyRow>(table: string, select = "*", apply?: (q: any) => any): Promise<T[]> {
  try {
    const client = supabaseAdmin();
    let query = client.from(table).select(select);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as T[];
  } catch (error) {
    console.warn(`Admin rows failed for ${table}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

async function schemaRows<T = AnyRow>(schema: string, table: string, select = "*", apply?: (q: any) => any): Promise<T[]> {
  try {
    const client = supabaseAdmin();
    let query = client.schema(schema).from(table).select(select);
    if (apply) query = apply(query);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []) as T[];
  } catch (error) {
    console.warn(`Admin rows failed for ${schema}.${table}:`, error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getAuthUsers() {
  try {
    const client = supabaseAdmin();
    const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return [] as AuthUser[];
    return data.users as AuthUser[];
  } catch (error) {
    console.warn("Admin auth users fetch failed:", error instanceof Error ? error.message : error);
    return [] as AuthUser[];
  }
}

async function authUsersCount() {
  const users = await getAuthUsers();
  return users.length;
}

export async function getCreatorProfileIds() {
  const [postCreators, liveCreators, groupOwners] = await Promise.all([
    rows<{ creator_id: string | null }>("posts", "creator_id", (q) => q.not("creator_id", "is", null).limit(5000)),
    rows<{ creator_id: string | null }>("live_streams", "creator_id", (q) => q.not("creator_id", "is", null).limit(5000)),
    rows<{ owner_profile_id: string | null }>("message_groups", "owner_profile_id", (q) => q.not("owner_profile_id", "is", null).limit(5000)),
  ]);
  return new Set<string>([
    ...postCreators.map((row) => row.creator_id).filter(Boolean),
    ...liveCreators.map((row) => row.creator_id).filter(Boolean),
    ...groupOwners.map((row) => row.owner_profile_id).filter(Boolean),
  ] as string[]);
}

export async function getDashboard() {
  noStore();
  const [authUsers, profiles, posts, lives, activeLives, follows, messages, finance, creatorIds, authList] = await Promise.all([
    authUsersCount(),
    count("profiles"),
    count("posts"),
    count("live_streams"),
    count("live_streams", (q) => q.eq("is_live", true)),
    count("follows"),
    count("messages"),
    getFinanceSummary(),
    getCreatorProfileIds(),
    getAuthUsers(),
  ]);
  const metadataCreatorCount = authList.filter(isCreatorAuth).length;
  const subscriptions = 0;
  return { authUsers, profiles, creators: Math.max(creatorIds.size, metadataCreatorCount), posts, lives, activeLives, subscriptions, follows, messages, finance };
}

export async function getFinanceSummary() {
  noStore();
  const feeConfig = await getTenantFeeRates();
  const apiResult = await buildrbrandApi<{ finance?: AnyRow }>(
    "/api/internal/ledger/finance?limit=500"
  );
  if (apiResult?.finance) {
    return normalizeFinanceSummary(apiResult.finance, feeConfig);
  }

  return emptyFinanceSummary({ ...feeConfig, source: "Buildrbrand ledger API unavailable" });
}

export async function getTransactionLogs() {
  noStore();
  const apiResult = await buildrbrandApi<{ transactions?: AnyRow[] }>(
    "/api/internal/ledger/finance?limit=500"
  );
  if (Array.isArray(apiResult?.transactions)) {
    return apiResult.transactions;
  }
  return [];
}

async function getLedgerTenant() {
  const tenantSlug = process.env.BUILDRBRAND_TENANT_SLUG?.trim() || "crcl";
  const tenants = await schemaRows<AnyRow>(
    "ledger",
    "tenants",
    "id,slug,platform_fee_bps,merchant_fee_bps",
    (q) => q.eq("slug", tenantSlug).limit(1)
  );
  return tenants[0] ?? null;
}

async function getLedgerWalletIds(tenantId: string) {
  const wallets = await schemaRows<{ id: string }>(
    "ledger",
    "wallets",
    "id",
    (q) => q.eq("tenant_id", tenantId).limit(5000)
  );
  return wallets.map((wallet) => wallet.id).filter(Boolean);
}

async function getLedgerFinanceSummary(feeConfig: { platformRate: number; merchantRate: number; source: string }) {
  const tenant = await getLedgerTenant();
  if (!tenant?.id) return null;

  const [intents, feeTransactions] = await Promise.all([
    schemaRows<AnyRow>(
      "ledger",
      "payment_intents",
      "id,amount,currency,status,metadata,created_at",
      (q) => q.eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(5000)
    ),
    schemaRows<AnyRow>(
      "ledger",
      "wallet_transactions",
      "id,amount,currency,direction,type,external_ref_type,external_ref_id,metadata,created_at",
      (q) =>
        q
          .in("external_ref_type", [
            "stripe_payment_intent_platform_fee",
            "stripe_payment_intent_merchant_fee",
          ])
          .order("created_at", { ascending: false })
          .limit(5000)
    ),
  ]);

  const settled = intents.filter((row) => activeStatuses.has(String(row.status || "").toLowerCase()));
  if (!settled.length) return null;

  const intentTotals = settled.reduce(
    (acc, row) => {
      const metadata = row.metadata ?? {};
      const platformFeeCents = centsFromDollars(metadata.platform_fee_amount ?? metadata.platform_fee);
      const merchantFeeCents = centsFromDollars(metadata.merchant_fee_amount ?? metadata.merchant_fee);
      const creatorNetCents = centsFromDollars(metadata.net_amount ?? row.amount);
      const grossCents =
        centsFromDollars(metadata.gross_amount) || creatorNetCents + platformFeeCents + merchantFeeCents;

      acc.grossCents += grossCents;
      acc.platformFeeCents += platformFeeCents;
      acc.merchantFeeCents += merchantFeeCents;
      acc.creatorNetCents += creatorNetCents;
      return acc;
    },
    { grossCents: 0, platformFeeCents: 0, merchantFeeCents: 0, creatorNetCents: 0 }
  );

  const feeTotals = feeTransactions
    .filter((row) => !row.metadata?.tenant_id || row.metadata.tenant_id === tenant.id)
    .reduce(
      (acc, row) => {
        const amountCents = centsFromDollars(row.amount);
        if (row.external_ref_type === "stripe_payment_intent_platform_fee") {
          acc.platformFeeCents += amountCents;
        }
        if (row.external_ref_type === "stripe_payment_intent_merchant_fee") {
          acc.merchantFeeCents += amountCents;
        }
        return acc;
      },
      { platformFeeCents: 0, merchantFeeCents: 0 }
    );

  const platformFeeCents = feeTotals.platformFeeCents || intentTotals.platformFeeCents;
  const merchantFeeCents = Number(process.env.BUILDRBRAND_MERCHANT_FEE_BPS ?? "0") > 0
    ? feeTotals.merchantFeeCents || intentTotals.merchantFeeCents
    : 0;
  const totals = {
    grossCents: intentTotals.grossCents,
    platformFeeCents,
    merchantFeeCents,
    creatorNetCents: Math.max(0, intentTotals.grossCents - platformFeeCents - merchantFeeCents),
  };

  return {
    ...totals,
    platformFeeRate: feeConfig.platformRate,
    merchantFeeRate: feeConfig.merchantRate,
    crclEarningsCents: totals.platformFeeCents,
    feeSource: feeTotals.platformFeeCents
      ? `Buildrbrand ledger platform fee transactions · ${feeConfig.source}`
      : `Buildrbrand ledger payment_intents · ${feeConfig.source}`,
  };
}

async function getLedgerTransactionLogs() {
  const tenant = await getLedgerTenant();
  if (!tenant?.id) return [];

  const walletIds = await getLedgerWalletIds(tenant.id);
  const transactionQuery = (q: any) => {
    const ordered = q.order("created_at", { ascending: false }).limit(100);
    return walletIds.length ? ordered.in("wallet_id", walletIds) : ordered.eq("wallet_id", "__none__");
  };

  const [walletTransactions, paymentIntents] = await Promise.all([
    schemaRows<AnyRow>(
      "ledger",
      "wallet_transactions",
      "id,wallet_id,amount,currency,direction,type,external_ref_type,external_ref_id,metadata,created_at",
      transactionQuery
    ),
    schemaRows<AnyRow>(
      "ledger",
      "payment_intents",
      "id,amount,currency,status,processor,processor_payment_id,description,metadata,created_at",
      (q) => q.eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(100)
    ),
  ]);

  const ledgerRows: AnyRow[] = walletTransactions.map((row) => ({
    ...row,
    id: row.external_ref_id || row.id,
    type: `Ledger ${row.direction || ""} ${row.type || "transaction"}`.replace(/\s+/g, " ").trim(),
    status: "posted",
    amount_cents: centsFromDollars(row.amount),
  }));

  const paymentRows: AnyRow[] = paymentIntents.map((row) => ({
    ...row,
    id: row.processor_payment_id || row.id,
    type: row.description || "Payment intent",
    amount_cents: centsFromDollars(row.metadata?.gross_amount) || centsFromDollars(row.amount),
  }));

  return [...ledgerRows, ...paymentRows]
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .slice(0, 100);
}

export async function getWithdrawalRequests() {
  const snapshot = await getWithdrawalQueueSnapshot();
  return snapshot.withdrawals;
}

export async function getWithdrawalQueueSnapshot() {
  noStore();

  const financeResult = await buildrbrandApi<{
    finance?: AnyRow;
    withdrawalRequests?: AnyRow[];
  }>("/api/internal/ledger/finance?limit=500");

  if (Array.isArray(financeResult?.withdrawalRequests)) {
    const finance = financeResult?.finance ?? {};
    return {
      withdrawals: financeResult.withdrawalRequests
        .filter(isVisibleLedgerRow)
        .map(normalizeWithdrawalRow),
      tenantBalance: {
        currency: "usd",
        availableCents: numberFrom(finance.walletAvailableCents),
        pendingCents: numberFrom(finance.walletPendingCents),
        reservedCents: numberFrom(finance.walletReservedCents),
        walletCount: numberFrom(finance.walletCount),
      },
    };
  }

  const apiResult = await buildrbrandApi<{ withdrawals?: AnyRow[]; tenantBalance?: TenantBalanceSummary }>(
    "/api/internal/ledger/withdrawals?limit=100"
  );

  if (Array.isArray(apiResult?.withdrawals)) {
    return {
      withdrawals: apiResult.withdrawals.filter(isVisibleLedgerRow).map(normalizeWithdrawalRow),
      tenantBalance: apiResult.tenantBalance ?? null,
    };
  }

  const ledgerRows = await schemaRows<AnyRow>(
    "ledger",
    "withdrawal_requests",
    "id,wallet_id,amount,currency,status,rail,destination_connected_account_id,created_at,updated_at",
    (q) => q.order("created_at", { ascending: false }).limit(100)
  );

  if (ledgerRows.length) {
    return {
      withdrawals: ledgerRows.filter(isVisibleLedgerRow).map(normalizeWithdrawalRow),
      tenantBalance: null,
    };
  }

  return {
    withdrawals: await rows<AnyRow>(
      "withdrawal_requests",
      "id,wallet_id,amount,currency,status,rail,destination_connected_account_id,created_at,updated_at",
      (q) => q.order("created_at", { ascending: false }).limit(100)
    ).then((result) => result.filter(isVisibleLedgerRow).map(normalizeWithdrawalRow)),
    tenantBalance: null,
  };
}

export async function getUsers(search = "") {
  noStore();
  const term = search.trim().toLowerCase();
  const [profileRows, authUsers, creatorIds] = await Promise.all([
    rows<AnyRow>("profiles", "id,user_id,username,full_name,email,avatar_url,is_suspended,is_shadow_banned,risk_score,created_at,updated_at", (q) => q.order("created_at", { ascending: false }).limit(1000)),
    getAuthUsers(),
    getCreatorProfileIds(),
  ]);
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const merged = profileRows.map((profile) => {
    const auth = profile.user_id ? authById.get(profile.user_id) ?? null : null;
    return { profile, auth, isCreator: Boolean(profile.is_creator) || creatorIds.has(profile.id) || isCreatorAuth(auth), isSuspended: Boolean(profile.is_suspended) || Boolean(auth?.banned_until) };
  });
  if (!term) return merged.slice(0, 150);
  return merged.filter(({ profile, auth }) => [profile.username, profile.full_name, profile.email, auth?.email, profile.id, profile.user_id].some((value) => String(value ?? "").toLowerCase().includes(term))).slice(0, 150);
}

export async function getCreators() {
  noStore();
  const users = await getUsers("");
  return users.filter((row) => row.isCreator).slice(0, 200);
}

export type ShopAdminProduct = {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  sourceType: string;
  imageUrl: string | null;
  priceTokens: number;
  compareAtPriceTokens: number | null;
  subscriberPriceTokens: number | null;
  inventoryQuantity: number | null;
  inventoryPolicy: string;
  active: boolean;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ShopAdminSummary = {
  creatorId: string;
  shopName: string;
  handle: string;
  ownerName: string;
  email: string | null;
  avatarUrl: string | null;
  sourceType: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  shopDomain: string | null;
  syncEnabled: boolean;
  productCount: number;
  activeProductCount: number;
  archivedProductCount: number;
  outOfStockCount: number;
  orderCount: number;
  paidOrderCount: number;
  grossTokens: number;
  grossCents: number;
  status: "active" | "needs_products" | "disabled";
  createdAt: string | null;
  updatedAt: string | null;
  products: ShopAdminProduct[];
};

export type ShopAdminDashboard = {
  stats: {
    totalShops: number;
    activeShops: number;
    activeProducts: number;
    archivedProducts: number;
    outOfStockProducts: number;
    paidOrders: number;
    grossTokens: number;
    grossCents: number;
  };
  shops: ShopAdminSummary[];
};

export function dollarsFromTokens(tokens: number) {
  return Math.round((Math.max(0, Number(tokens) || 0) / TOKENS_PER_DOLLAR) * 100);
}

function recordFrom(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function stringFrom(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nullableString(value: unknown) {
  const text = stringFrom(value);
  return text || null;
}

function normalizeSource(value: unknown) {
  const source = stringFrom(value, "native").toLowerCase();
  if (source === "shopify") return "shopify";
  if (source === "pod" || source === "print_on_demand" || source === "print on demand") return "pod";
  return "native";
}

export function shopSourceLabel(value: string) {
  if (value === "shopify") return "Shopify";
  if (value === "pod") return "Print on demand";
  return "Native CRCL";
}

function firstImage(images: unknown) {
  if (!Array.isArray(images)) return null;
  for (const image of images) {
    if (typeof image === "string" && image.trim()) return image.trim();
    if (image && typeof image === "object") {
      const record = image as Record<string, unknown>;
      const url = nullableString(record.url ?? record.src ?? record.image ?? record.path);
      if (url) return url;
    }
  }
  return null;
}

function normalizeShopProduct(row: AnyRow): ShopAdminProduct {
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    title: stringFrom(row.title, "Untitled product"),
    description: stringFrom(row.description),
    sourceType: normalizeSource(row.source_type),
    imageUrl: firstImage(row.images),
    priceTokens: Math.max(0, Math.round(numberFrom(row.price_tokens))),
    compareAtPriceTokens:
      row.compare_at_price_tokens === null || row.compare_at_price_tokens === undefined
        ? null
        : Math.max(0, Math.round(numberFrom(row.compare_at_price_tokens))),
    subscriberPriceTokens:
      row.subscriber_price_tokens === null || row.subscriber_price_tokens === undefined
        ? null
        : Math.max(0, Math.round(numberFrom(row.subscriber_price_tokens))),
    inventoryQuantity:
      row.inventory_quantity === null || row.inventory_quantity === undefined
        ? null
        : Math.max(0, Math.trunc(numberFrom(row.inventory_quantity))),
    inventoryPolicy: row.inventory_policy === "continue" ? "continue" : "deny",
    active: row.active !== false,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function shopNameFrom(settings: AnyRow | null, profile: AnyRow | null) {
  const metadata = recordFrom(settings?.metadata);
  return (
    stringFrom(metadata.shop_name) ||
    stringFrom(metadata.shopName) ||
    stringFrom(settings?.shop_domain) ||
    stringFrom(profile?.full_name) ||
    stringFrom(profile?.username) ||
    "Creator shop"
  );
}

function shopSourceFrom(settings: AnyRow | null, products: ShopAdminProduct[]) {
  const metadata = recordFrom(settings?.metadata);
  return normalizeSource(metadata.source_type ?? metadata.sourceType ?? products[0]?.sourceType);
}

function shopDescriptionFrom(settings: AnyRow | null, profile: AnyRow | null) {
  const metadata = recordFrom(settings?.metadata);
  return (
    stringFrom(metadata.description) ||
    stringFrom(metadata.shop_description) ||
    stringFrom(profile?.bio) ||
    "Creator products, drops, and live-shopping inventory."
  );
}

function logoFrom(settings: AnyRow | null, profile: AnyRow | null) {
  const metadata = recordFrom(settings?.metadata);
  return (
    nullableString(metadata.logo_url) ||
    nullableString(metadata.logoUrl) ||
    nullableString(metadata.logo) ||
    nullableString(metadata.logoImage) ||
    nullableString(metadata.logo_image) ||
    nullableString(profile?.avatar_url)
  );
}

function bannerFrom(settings: AnyRow | null) {
  const metadata = recordFrom(settings?.metadata);
  return (
    nullableString(metadata.banner_url) ||
    nullableString(metadata.bannerUrl) ||
    nullableString(metadata.banner) ||
    nullableString(metadata.bannerImage) ||
    nullableString(metadata.banner_image)
  );
}

function latestDate(...values: Array<string | null | undefined>) {
  const dates = values.filter(Boolean).map(String).sort((a, b) => b.localeCompare(a));
  return dates[0] ?? null;
}

export async function getShopControlCenter(search = ""): Promise<ShopAdminDashboard> {
  noStore();
  const term = search.trim().toLowerCase();
  const [settingsRows, productRows, orderRows] = await Promise.all([
    rows<AnyRow>(
      "creator_store_settings",
      "id,creator_id,shop_domain,sync_enabled,metadata,created_at,updated_at",
      (q) => q.order("updated_at", { ascending: false }).limit(1000)
    ),
    rows<AnyRow>(
      "creator_products",
      "id,creator_id,source_type,title,description,images,price_tokens,compare_at_price_tokens,subscriber_price_tokens,inventory_quantity,inventory_policy,active,archived_at,created_at,updated_at",
      (q) => q.order("created_at", { ascending: false }).limit(5000)
    ),
    rows<AnyRow>(
      "orders",
      "id,creator_id,total_amount_tokens,status,payment_status,created_at,updated_at",
      (q) => q.order("created_at", { ascending: false }).limit(5000)
    ),
  ]);

  const products = productRows.map(normalizeShopProduct);
  const creatorIds = [
    ...new Set([
      ...settingsRows.map((row) => row.creator_id).filter(Boolean),
      ...products.map((product) => product.creatorId).filter(Boolean),
      ...orderRows.map((row) => row.creator_id).filter(Boolean),
    ]),
  ].map(String);
  const profileRows = creatorIds.length
    ? await rows<AnyRow>(
        "profiles",
        "id,user_id,username,full_name,email,avatar_url,bio,created_at,updated_at",
        (q) => q.in("id", creatorIds).limit(1000)
      )
    : [];

  const profileById = new Map(profileRows.map((profile) => [String(profile.id), profile]));
  const settingsByCreator = new Map(settingsRows.map((settings) => [String(settings.creator_id), settings]));
  const productsByCreator = new Map<string, ShopAdminProduct[]>();
  const ordersByCreator = new Map<string, AnyRow[]>();

  for (const product of products) {
    const list = productsByCreator.get(product.creatorId) ?? [];
    list.push(product);
    productsByCreator.set(product.creatorId, list);
  }

  for (const order of orderRows) {
    const creatorId = String(order.creator_id ?? "");
    if (!creatorId) continue;
    const list = ordersByCreator.get(creatorId) ?? [];
    list.push(order);
    ordersByCreator.set(creatorId, list);
  }

  const shops = creatorIds.map((creatorId) => {
    const settings = settingsByCreator.get(creatorId) ?? null;
    const profile = profileById.get(creatorId) ?? null;
    const shopProducts = (productsByCreator.get(creatorId) ?? []).sort((a, b) =>
      String(b.updatedAt ?? b.createdAt ?? "").localeCompare(String(a.updatedAt ?? a.createdAt ?? ""))
    );
    const shopOrders = ordersByCreator.get(creatorId) ?? [];
    const activeProducts = shopProducts.filter((product) => product.active);
    const archivedProducts = shopProducts.filter((product) => !product.active || Boolean(product.archivedAt));
    const outOfStockProducts = activeProducts.filter(
      (product) => product.inventoryPolicy !== "continue" && product.inventoryQuantity !== null && product.inventoryQuantity <= 0
    );
    const paidOrders = shopOrders.filter((order) =>
      activeStatuses.has(String(order.status ?? order.payment_status ?? "").toLowerCase())
    );
    const grossTokens = paidOrders.reduce((sum, order) => sum + Math.max(0, Math.round(numberFrom(order.total_amount_tokens))), 0);
    const sourceType = shopSourceFrom(settings, shopProducts);
    const shopName = shopNameFrom(settings, profile);
    const handle = stringFrom(profile?.username, creatorId.slice(0, 8));
    const summary: ShopAdminSummary = {
      creatorId,
      shopName,
      handle,
      ownerName: stringFrom(profile?.full_name, shopName),
      email: nullableString(profile?.email),
      avatarUrl: nullableString(profile?.avatar_url),
      sourceType,
      description: shopDescriptionFrom(settings, profile),
      logoUrl: logoFrom(settings, profile),
      bannerUrl: bannerFrom(settings),
      shopDomain: nullableString(settings?.shop_domain),
      syncEnabled: Boolean(settings?.sync_enabled),
      productCount: shopProducts.length,
      activeProductCount: activeProducts.length,
      archivedProductCount: archivedProducts.length,
      outOfStockCount: outOfStockProducts.length,
      orderCount: shopOrders.length,
      paidOrderCount: paidOrders.length,
      grossTokens,
      grossCents: dollarsFromTokens(grossTokens),
      status: activeProducts.length ? "active" : shopProducts.length ? "disabled" : "needs_products",
      createdAt: settings?.created_at ?? profile?.created_at ?? shopProducts[0]?.createdAt ?? null,
      updatedAt: latestDate(
        settings?.updated_at,
        profile?.updated_at,
        ...shopProducts.map((product) => product.updatedAt ?? product.createdAt)
      ),
      products: shopProducts,
    };
    return summary;
  });

  const filtered = term
    ? shops.filter((shop) =>
        [
          shop.shopName,
          shop.handle,
          shop.ownerName,
          shop.email,
          shop.creatorId,
          shop.sourceType,
          shop.description,
          ...shop.products.map((product) => product.title),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
    : shops;

  const sorted = filtered.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))).slice(0, 250);
  const stats = sorted.reduce(
    (acc, shop) => {
      acc.totalShops += 1;
      acc.activeShops += shop.status === "active" ? 1 : 0;
      acc.activeProducts += shop.activeProductCount;
      acc.archivedProducts += shop.archivedProductCount;
      acc.outOfStockProducts += shop.outOfStockCount;
      acc.paidOrders += shop.paidOrderCount;
      acc.grossTokens += shop.grossTokens;
      acc.grossCents += shop.grossCents;
      return acc;
    },
    {
      totalShops: 0,
      activeShops: 0,
      activeProducts: 0,
      archivedProducts: 0,
      outOfStockProducts: 0,
      paidOrders: 0,
      grossTokens: 0,
      grossCents: 0,
    }
  );

  return { stats, shops: sorted };
}

export async function getPosts() {
  noStore();
  const posts = await rows<AnyRow>("posts", "id,creator_id,caption,is_gated,gating_mode,unlock_price_cents,created_at", (q) => q.order("created_at", { ascending: false }).limit(150));
  const creatorIds = [...new Set(posts.map((post) => post.creator_id).filter(Boolean))];
  const creators = creatorIds.length ? await rows<AnyRow>("profiles", "id,username,full_name,avatar_url", (q) => q.in("id", creatorIds)) : [];
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
  return posts.map((post) => ({ ...post, creator: creatorMap.get(post.creator_id) ?? null }));
}

export async function getLiveStreams() {
  noStore();
  const streams = await rows<AnyRow>("live_streams", "id,creator_id,is_live,status,title,caption,viewers,gifts,started_at,created_at,ended_at,transport_config", (q) => q.order("created_at", { ascending: false }).limit(150));
  const creatorIds = [...new Set(streams.map((stream) => stream.creator_id).filter(Boolean))];
  const creators = creatorIds.length ? await rows<AnyRow>("profiles", "id,username,full_name,avatar_url", (q) => q.in("id", creatorIds)) : [];
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]));
  return streams.map((stream) => ({ ...stream, creator: creatorMap.get(stream.creator_id) ?? null }));
}

export async function getApplications() {
  noStore();
  const authUsers = await getAuthUsers();
  return authUsers
    .filter((user) => Boolean(user.user_metadata?.creator_application || user.user_metadata?.creator_application_submitted_at || user.user_metadata?.creator_application_status))
    .map((user) => {
      const metadata = user.user_metadata ?? {};
      const application = metadata.creator_application ?? {
        submittedAt: metadata.creator_application_submitted_at,
        status: metadata.creator_application_status ?? "submitted",
      };
      return {
        user,
        application: {
          ...application,
          status: application.status ?? metadata.creator_application_status ?? "submitted",
          submittedAt: application.submittedAt ?? metadata.creator_application_submitted_at,
        },
      };
    })
    .filter(({ application }) => {
      const status = String(application?.status ?? "submitted").toLowerCase();
      return status === "submitted" || status === "pending";
    })
    .sort((a, b) => String(b.application?.submittedAt ?? b.user.created_at).localeCompare(String(a.application?.submittedAt ?? a.user.created_at)));
}
