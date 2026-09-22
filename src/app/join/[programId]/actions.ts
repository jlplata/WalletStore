"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { customerRegistrationSchema } from "@/lib/validations/customer";
import { dispatchWebhooks } from "@/lib/webhooks/dispatch";

export type JoinFormState = { error?: string };

export async function registerCustomerAction(
  organizationId: string,
  programId: string,
  _prevState: JoinFormState,
  formData: FormData
): Promise<JoinFormState> {
  const parsed = customerRegistrationSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    birthdate: formData.get("birthdate"),
    marketingConsent: formData.get("marketingConsent") === "on",
    termsAccepted: formData.get("termsAccepted") === "on" ? true : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." };
  }

  const supabase = await createClient();
  const { data: customer, error } = await supabase.rpc("register_customer", {
    p_organization_id: organizationId,
    p_program_id: programId,
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName || null,
    p_phone: parsed.data.phone || null,
    p_email: parsed.data.email || null,
    p_birthdate: parsed.data.birthdate || null,
    p_marketing_consent: parsed.data.marketingConsent,
    p_terms_version: "v1",
    p_source: "join_page",
  });

  if (error || !customer) {
    return { error: error?.message ?? "No se pudo completar el registro." };
  }

  // register_customer() re-uses an existing customer (matched by phone/email)
  // when someone re-joins the same business, so only fire the webhook when
  // this really was a brand-new signup.
  const justCreated = Date.now() - new Date(customer.created_at).getTime() < 5000;
  if (justCreated) {
    await dispatchWebhooks(organizationId, "customer.created", {
      customer_id: customer.id,
      program_id: programId,
    });
  }

  redirect(`/join/${programId}/lista?token=${customer.qr_token}`);
}
