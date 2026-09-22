"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgRole } from "@/lib/authz/session";

// Writes to `subscriptions` are otherwise service-role-only (see the RLS
// migration) — normally only the Stripe webhook writes this table. The mock
// checkout stands in for that webhook when no real Stripe account is
// configured, so it uses the admin client the same way the webhook does.
export async function activateMockPlanAction(organizationId: string, planCode: string, returnTo: string) {
  await requireOrgRole(organizationId, "organization.billing.manage");

  const supabase = createAdminClient();
  const { data: plan } = await supabase.from("plans").select("id").eq("code", planCode).single();
  if (!plan) throw new Error("Plan no encontrado.");

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  await supabase.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      plan_id: plan.id,
      billing_provider: "mock",
      provider_customer_id: null,
      provider_subscription_id: null,
      status: "ACTIVE",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    },
    { onConflict: "organization_id" }
  );

  await supabase.from("organizations").update({ status: "ACTIVE" }).eq("id", organizationId);

  redirect(returnTo);
}
