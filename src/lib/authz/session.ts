import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PERMISSIONS, type PermissionAction } from "./permissions";
import type { MemberRole } from "@/lib/supabase/database.types";

export class AuthzError extends Error {
  constructor(message = "No autorizado.") {
    super(message);
    this.name = "AuthzError";
  }
}

/** Throws/redirects if there is no authenticated Supabase user. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Loads the caller's membership row for an organization. Returns null if
 * they are not a member (and not a platform admin) — callers decide whether
 * that's a 404, a redirect, or a thrown error.
 *
 * IMPORTANT: `organizationId` must come from a trusted source (a route
 * param resolved against data already scoped to the user, or re-derived
 * server-side) — never trust a bare client-submitted org id for anything
 * other than "which org is this membership check for". RLS is the backstop
 * if this check is ever skipped.
 */
export async function getOrgMembership(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_platform_admin) {
    return { role: "ORGANIZATION_OWNER" as MemberRole, isPlatformAdmin: true, branchIds: [] as string[] };
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("role, branch_ids")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return null;

  return {
    role: member.role,
    isPlatformAdmin: false,
    branchIds: member.branch_ids ?? [],
  };
}

/**
 * Requires the caller to be a member of `organizationId` with a role allowed
 * for `action` (see permissions.ts). Throws AuthzError otherwise — Server
 * Actions should catch this and surface a form error; Route Handlers should
 * map it to a 403.
 */
export async function requireOrgRole(
  organizationId: string,
  action: PermissionAction
) {
  const membership = await getOrgMembership(organizationId);
  if (!membership) {
    throw new AuthzError("No perteneces a esta organización.");
  }

  const allowedRoles = PERMISSIONS[action];
  if (
    !membership.isPlatformAdmin &&
    !(allowedRoles as readonly MemberRole[]).includes(membership.role)
  ) {
    throw new AuthzError(
      `Tu rol (${membership.role}) no puede realizar esta acción.`
    );
  }

  return membership;
}
