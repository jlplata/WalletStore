"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/authz/session";
import { programSchema, slugify } from "@/lib/validations/onboarding";

export type ProgramFormState = { error?: string };

export async function createProgramFullAction(
  orgId: string,
  orgSlug: string,
  _prevState: ProgramFormState,
  formData: FormData
): Promise<ProgramFormState> {
  await requireOrgRole(orgId, "program.manage");

  const type = formData.get("type") === "POINTS" ? "POINTS" : "STAMPS";
  const parsed = programSchema.safeParse({
    name: formData.get("name"),
    type,
    rewardHeadline: formData.get("rewardHeadline"),
    stampsRequired: formData.get("stampsRequired") || undefined,
    stampsPerPurchase: formData.get("stampsPerPurchase") || "1",
    minPurchaseAmountCents: formData.get("minPurchaseAmountCents") || "0",
    pointsPerCurrencyUnit: formData.get("pointsPerCurrencyUnit") || undefined,
    currencyUnitCents: formData.get("currencyUnitCents") || "100",
    pointsCostForReward: formData.get("pointsCostForReward") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Completa las reglas del programa." };
  }

  const supabase = await createClient();
  const baseSlug = slugify(parsed.data.name) || "programa";

  const { data: program, error: programError } = await supabase
    .from("programs")
    .insert({
      organization_id: orgId,
      name: parsed.data.name,
      slug: baseSlug,
      type: parsed.data.type,
      reward_headline: parsed.data.rewardHeadline,
    })
    .select("id")
    .single();

  if (programError || !program) {
    return { error: programError?.message ?? "No se pudo crear el programa." };
  }

  const { error: rulesError } = await supabase.from("program_rules").insert({
    program_id: program.id,
    organization_id: orgId,
    stamps_required: parsed.data.type === "STAMPS" ? parsed.data.stampsRequired : null,
    stamps_per_purchase: parsed.data.stampsPerPurchase ?? 1,
    min_purchase_amount_cents: parsed.data.minPurchaseAmountCents ?? 0,
    points_per_currency_unit: parsed.data.type === "POINTS" ? parsed.data.pointsPerCurrencyUnit : null,
    currency_unit_cents: parsed.data.currencyUnitCents ?? 100,
  });

  if (rulesError) {
    await supabase.from("programs").delete().eq("id", program.id);
    return { error: rulesError.message };
  }

  await supabase.from("rewards").insert({
    organization_id: orgId,
    program_id: program.id,
    name: parsed.data.rewardHeadline,
    type: "FREE_ITEM",
    cost_stamps: parsed.data.type === "STAMPS" ? parsed.data.stampsRequired : null,
    cost_points: parsed.data.type === "POINTS" ? parsed.data.pointsCostForReward : null,
  });

  revalidatePath(`/org/${orgSlug}/programs`);
  return {};
}

export async function toggleProgramActiveAction(
  orgId: string,
  orgSlug: string,
  programId: string,
  nextActive: boolean
) {
  await requireOrgRole(orgId, "program.manage");
  const supabase = await createClient();
  await supabase
    .from("programs")
    .update({ is_active: nextActive })
    .eq("id", programId)
    .eq("organization_id", orgId);
  revalidatePath(`/org/${orgSlug}/programs`);
}
