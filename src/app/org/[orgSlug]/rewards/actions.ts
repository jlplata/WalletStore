"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/authz/session";
import { rewardSchema } from "@/lib/validations/reward";

export type RewardFormState = { error?: string };

export async function createRewardAction(
  orgId: string,
  orgSlug: string,
  _prevState: RewardFormState,
  formData: FormData
): Promise<RewardFormState> {
  await requireOrgRole(orgId, "reward.manage");

  const parsed = rewardSchema.safeParse({
    programId: formData.get("programId"),
    name: formData.get("name"),
    description: formData.get("description"),
    type: formData.get("type"),
    costStamps: formData.get("costStamps") || undefined,
    costPoints: formData.get("costPoints") || undefined,
    discountAmountCents: formData.get("discountAmountCents") || undefined,
    discountPercentage: formData.get("discountPercentage") || undefined,
    perCustomerLimit: formData.get("perCustomerLimit") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  if (!parsed.data.costStamps && !parsed.data.costPoints) {
    return { error: "Indica el costo en sellos o en puntos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rewards").insert({
    organization_id: orgId,
    program_id: parsed.data.programId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    type: parsed.data.type,
    cost_stamps: parsed.data.costStamps ?? null,
    cost_points: parsed.data.costPoints ?? null,
    discount_amount_cents: parsed.data.discountAmountCents ?? null,
    discount_percentage: parsed.data.discountPercentage ?? null,
    per_customer_limit: parsed.data.perCustomerLimit ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/rewards`);
  return {};
}

export async function toggleRewardActiveAction(
  orgId: string,
  orgSlug: string,
  rewardId: string,
  nextActive: boolean
) {
  await requireOrgRole(orgId, "reward.manage");
  const supabase = await createClient();
  await supabase
    .from("rewards")
    .update({ is_active: nextActive })
    .eq("id", rewardId)
    .eq("organization_id", orgId);
  revalidatePath(`/org/${orgSlug}/rewards`);
}
