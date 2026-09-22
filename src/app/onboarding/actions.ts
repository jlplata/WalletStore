"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireOrgRole } from "@/lib/authz/session";
import {
  businessInfoSchema,
  brandingSchema,
  branchSchema,
  programSchema,
  slugify,
} from "@/lib/validations/onboarding";

export type OnboardingFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

async function uniqueSlugFor(name: string) {
  const supabase = await createClient();
  const base = slugify(name) || "negocio";
  let candidate = base;
  let attempt = 1;
  // Slugs are short-lived to generate (a handful of businesses signing up at
  // once, not a hot path), so a simple existence-check loop is fine.
  while (attempt < 50) {
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return `${base}-${Date.now()}`;
}

export async function createOrganizationAction(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireUser();

  const parsed = businessInfoSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    category: formData.get("category"),
    country: formData.get("country") || "MX",
    currency: formData.get("currency") || "MXN",
    timezone: formData.get("timezone") || "America/Mexico_City",
    phone: formData.get("phone"),
    email: formData.get("email"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const slug = await uniqueSlugFor(parsed.data.name);

  const { data: org, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: slug,
    p_category: parsed.data.category,
    p_country: parsed.data.country,
    p_currency: parsed.data.currency,
    p_timezone: parsed.data.timezone,
    p_phone: parsed.data.phone || null,
    p_email: parsed.data.email || null,
    p_website: parsed.data.website || null,
  });

  if (error || !org) {
    return { error: error?.message ?? "No se pudo crear el negocio." };
  }

  redirect(`/onboarding/${org.id}/marca`);
}

export async function updateBrandingAction(
  orgId: string,
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  await requireOrgRole(orgId, "organization.update");

  const parsed = brandingSchema.safeParse({
    brandPrimaryColor: formData.get("brandPrimaryColor"),
    brandSecondaryColor: formData.get("brandSecondaryColor"),
    logoUrl: formData.get("logoUrl"),
    bannerUrl: formData.get("bannerUrl"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      brand_primary_color: parsed.data.brandPrimaryColor,
      brand_secondary_color: parsed.data.brandSecondaryColor,
      logo_url: parsed.data.logoUrl || null,
      banner_url: parsed.data.bannerUrl || null,
    })
    .eq("id", orgId);

  if (error) {
    return { error: error.message };
  }

  redirect(`/onboarding/${orgId}/sucursal`);
}

export async function createBranchAction(
  orgId: string,
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
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

  // Idempotent: onboarding steps can be revisited (back button, refresh)
  // without creating duplicate branches.
  const { data: existing } = await supabase
    .from("branches")
    .select("id")
    .eq("organization_id", orgId)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("branches").insert({
      organization_id: orgId,
      name: parsed.data.name,
      address: parsed.data.address || null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      phone: parsed.data.phone || null,
    });
    if (error) {
      return { error: error.message };
    }
  }

  redirect(`/onboarding/${orgId}/programa`);
}

export async function createProgramAction(
  orgId: string,
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
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
    .select("id, slug")
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
    // Compensate: don't leave a program without rules.
    await supabase.from("programs").delete().eq("id", program.id);
    return { error: rulesError.message };
  }

  // First reward, derived directly from the onboarding headline so the
  // join page and POS have something real to show immediately.
  await supabase.from("rewards").insert({
    organization_id: orgId,
    program_id: program.id,
    name: parsed.data.rewardHeadline,
    type: "FREE_ITEM",
    cost_stamps: parsed.data.type === "STAMPS" ? parsed.data.stampsRequired : null,
    cost_points: parsed.data.type === "POINTS" ? parsed.data.pointsCostForReward : null,
  });

  redirect(`/onboarding/${orgId}/wallet?programId=${program.id}`);
}

export async function finishOnboardingAction(orgId: string) {
  await requireOrgRole(orgId, "organization.update");
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .single();

  redirect(`/org/${org?.slug ?? ""}/dashboard`);
}
