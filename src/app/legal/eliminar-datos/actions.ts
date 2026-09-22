"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type PrivacyRequestState = { success?: boolean; error?: string };

const schema = z
  .object({
    email: z.string().email("Correo inválido.").optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((d) => !!d.email || !!d.phone, { message: "Ingresa tu correo o teléfono.", path: ["email"] });

export async function submitPrivacyRequestAction(
  _prevState: PrivacyRequestState,
  formData: FormData
): Promise<PrivacyRequestState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_privacy_request", {
    p_organization_id: null,
    p_request_type: "DELETE_DATA",
    p_contact_email: parsed.data.email || null,
    p_contact_phone: parsed.data.phone || null,
    p_notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
