"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/authz/session";
import { brandingSchema } from "@/lib/validations/onboarding";

export type SettingsFormState = { error?: string; success?: boolean };

const generalSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre de tu negocio.").max(120),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Correo inválido.").optional().or(z.literal("")),
  website: z.string().url("URL inválida.").optional().or(z.literal("")),
});

export async function updateGeneralSettingsAction(
  orgId: string,
  orgSlug: string,
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireOrgRole(orgId, "organization.update");

  const parsed = generalSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    website: formData.get("website"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      website: parsed.data.website || null,
    })
    .eq("id", orgId);

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}

export async function updateOrgBrandingAction(
  orgId: string,
  orgSlug: string,
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
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

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/settings`);
  return { success: true };
}
