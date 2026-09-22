import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/authz/session";

export async function loadOnboardingOrg(orgId: string) {
  await requireOrgRole(orgId, "organization.update");
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, brand_primary_color, brand_secondary_color, logo_url")
    .eq("id", orgId)
    .single();

  if (!org) notFound();
  return org;
}
