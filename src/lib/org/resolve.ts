import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole, type AuthzError } from "@/lib/authz/session";
import type { PermissionAction } from "@/lib/authz/permissions";

/**
 * Resolves an organization by its URL slug and enforces that the current
 * user has a role allowed for `action`. Used at the top of every
 * `/org/[orgSlug]/...` page that mutates or displays org-scoped data beyond
 * what the shared layout already checked (the layout only checks plain
 * membership, not the specific action).
 */
export async function resolveOrgForAction(orgSlug: string, action: PermissionAction) {
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, currency")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) notFound();

  try {
    const membership = await requireOrgRole(org.id, action);
    return { org, membership };
  } catch (err) {
    throw err as AuthzError;
  }
}
