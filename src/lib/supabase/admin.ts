import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

// Service-role client. Bypasses RLS entirely — NEVER import this from a
// Client Component, and never forward its key to the browser. Use only in
// Route Handlers / Server Actions that have already performed their own
// authorization check (webhooks, wallet issuance, billing sync, admin ops).
export function createAdminClient() {
  return createSupabaseClient<Database>(
    supabaseEnv.url,
    supabaseEnv.serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
