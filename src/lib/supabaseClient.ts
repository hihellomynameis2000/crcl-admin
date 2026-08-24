import { createClient } from "@supabase/supabase-js";

const tenantSchema = process.env.BUILDRBRAND_TENANT_SLUG || "public";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: { schema: tenantSchema },
  }
);
