import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Records a sensitive action to audit_logs (section 26 of the product
 * spec): role/billing/program-rule changes, manual point adjustments,
 * redemptions, exports. Writes go through the admin client because
 * audit_logs has no client-facing INSERT policy (see the RLS migration) —
 * this function is the only supported way to add a row.
 */
export async function logAuditEvent(input: {
  organizationId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    userAgent = h.get("user-agent");
  } catch {
    // headers() is only available within a request scope; ignore elsewhere.
  }

  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_user_id: user?.id ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ip,
    user_agent: userAgent,
  });
}
