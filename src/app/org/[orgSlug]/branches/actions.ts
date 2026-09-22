"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/authz/session";
import { branchSchema } from "@/lib/validations/onboarding";

export type BranchFormState = { error?: string };

export async function createBranchAction(
  orgId: string,
  orgSlug: string,
  _prevState: BranchFormState,
  formData: FormData
): Promise<BranchFormState> {
  await requireOrgRole(orgId, "branch.manage");

  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({
    organization_id: orgId,
    name: parsed.data.name,
    address: parsed.data.address || null,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    phone: parsed.data.phone || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgSlug}/branches`);
  return {};
}

export async function updateBranchAction(
  orgId: string,
  orgSlug: string,
  branchId: string,
  _prevState: BranchFormState,
  formData: FormData
): Promise<BranchFormState> {
  await requireOrgRole(orgId, "branch.manage");

  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      phone: parsed.data.phone || null,
    })
    .eq("id", branchId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };

  revalidatePath(`/org/${orgSlug}/branches`);
  return {};
}

export async function toggleBranchActiveAction(
  orgId: string,
  orgSlug: string,
  branchId: string,
  nextActive: boolean
) {
  await requireOrgRole(orgId, "branch.manage");
  const supabase = await createClient();
  await supabase
    .from("branches")
    .update({ is_active: nextActive })
    .eq("id", branchId)
    .eq("organization_id", orgId);

  revalidatePath(`/org/${orgSlug}/branches`);
}
