"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/authz/platform";
import { logAuditEvent } from "@/lib/audit";
import type { OrganizationStatus } from "@/lib/supabase/database.types";

export async function setOrganizationStatusAction(orgId: string, status: OrganizationStatus) {
  await requirePlatformAdmin();

  const supabase = await createClient();
  const { data: before } = await supabase.from("organizations").select("status").eq("id", orgId).single();

  await supabase.from("organizations").update({ status }).eq("id", orgId);

  await logAuditEvent({
    organizationId: orgId,
    action: "platform.organization_status_changed",
    entityType: "organizations",
    entityId: orgId,
    before: { status: before?.status },
    after: { status },
  });

  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/organizations");
}
