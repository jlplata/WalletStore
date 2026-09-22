import type { MemberRole } from "@/lib/supabase/database.types";

/**
 * Central action -> allowed-roles matrix. Server Actions and Route Handlers
 * call `requireOrgRole` (see session.ts) with an entry from here instead of
 * hardcoding role arrays inline, so the permission model stays in one place
 * and extensible (add an action, add a role array).
 *
 * This is a *second* line of defense: Postgres RLS + the SECURITY DEFINER
 * RPCs are the first and cannot be bypassed even if a Server Action forgets
 * to call this. See supabase/migrations and docs/security.md.
 */
export const PERMISSIONS = {
  "organization.update": [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_ADMIN",
  ],
  "organization.billing.manage": ["ORGANIZATION_OWNER"],
  "branch.manage": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "program.manage": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "reward.manage": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "team.invite": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "team.remove": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "customer.view": [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_ADMIN",
    "BRANCH_MANAGER",
    "CASHIER",
  ],
  "customer.export": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "purchase.record": [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_ADMIN",
    "BRANCH_MANAGER",
    "CASHIER",
  ],
  "purchase.refund": [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_ADMIN",
    "BRANCH_MANAGER",
  ],
  "reward.redeem": [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_ADMIN",
    "BRANCH_MANAGER",
    "CASHIER",
  ],
  "balance.adjust": [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_ADMIN",
    "BRANCH_MANAGER",
  ],
  "campaign.manage": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "webhook.manage": ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  "report.view": [
    "ORGANIZATION_OWNER",
    "ORGANIZATION_ADMIN",
    "BRANCH_MANAGER",
  ],
} as const satisfies Record<string, readonly MemberRole[]>;

export type PermissionAction = keyof typeof PERMISSIONS;
