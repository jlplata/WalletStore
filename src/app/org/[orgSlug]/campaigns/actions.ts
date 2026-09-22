"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgRole } from "@/lib/authz/session";
import { getEmailProvider } from "@/lib/email";
import { dispatchWebhooks } from "@/lib/webhooks/dispatch";

export type CampaignFormState = { error?: string };

const campaignSchema = z.object({
  name: z.string().min(2, "Ingresa un nombre para la campaña.").max(120),
  type: z.enum(["PROMOTION", "BIRTHDAY", "WIN_BACK", "BONUS_POINTS", "DOUBLE_STAMPS", "CUSTOM"]),
  programId: z.string().uuid("Selecciona un programa."),
  audienceSegment: z.string().min(1),
  subject: z.string().min(2, "Ingresa un asunto.").max(150),
  message: z.string().min(2, "Escribe el mensaje.").max(2000),
});

export async function createAndSendCampaignAction(
  orgId: string,
  orgSlug: string,
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  await requireOrgRole(orgId, "campaign.manage");

  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    programId: formData.get("programId"),
    audienceSegment: formData.get("audienceSegment"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      organization_id: orgId,
      program_id: parsed.data.programId,
      name: parsed.data.name,
      type: parsed.data.type,
      channel: "EMAIL",
      status: "SENDING",
      subject: parsed.data.subject,
      message: parsed.data.message,
      audience_segment: parsed.data.audienceSegment,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    return { error: campaignError?.message ?? "No se pudo crear la campaña." };
  }

  // Resolve the audience now and snapshot it, so a later change in segment
  // membership doesn't retroactively change who this campaign targeted.
  let customers: { id: string; first_name: string; email: string | null }[] = [];
  if (parsed.data.audienceSegment === "ALL") {
    const { data } = await supabase
      .from("customer_program_enrollments")
      .select("customers!inner(id, first_name, email)")
      .eq("organization_id", orgId)
      .eq("program_id", parsed.data.programId);
    customers = (data ?? []).map(
      (e) => e.customers as unknown as { id: string; first_name: string; email: string | null }
    );
  } else {
    const { data } = await supabase.rpc("customers_in_segment", {
      p_organization_id: orgId,
      p_program_id: parsed.data.programId,
      p_segment: parsed.data.audienceSegment,
    });
    customers = (data ?? []).map((c) => ({ id: c.id, first_name: c.first_name, email: c.email }));
  }

  const admin = createAdminClient();
  if (customers.length > 0) {
    await admin.from("campaign_audiences").insert(
      customers.map((c) => ({ campaign_id: campaign.id, customer_id: c.id }))
    );
  }

  const emailProvider = getEmailProvider();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const customer of customers) {
    if (!customer.email) {
      skipped += 1;
      continue;
    }
    try {
      const result = await emailProvider.send({
        to: customer.email,
        subject: parsed.data.subject,
        html: `<p>Hola ${customer.first_name},</p><p>${parsed.data.message.replace(/\n/g, "<br/>")}</p>`,
      });
      await admin.from("campaign_deliveries").insert({
        campaign_id: campaign.id,
        customer_id: customer.id,
        channel: "EMAIL",
        status: "SENT",
        provider_message_id: result.id,
        sent_at: new Date().toISOString(),
      });
      sent += 1;
    } catch (err) {
      await admin.from("campaign_deliveries").insert({
        campaign_id: campaign.id,
        customer_id: customer.id,
        channel: "EMAIL",
        status: "FAILED",
        error: err instanceof Error ? err.message : "unknown error",
      });
      failed += 1;
    }
  }

  await admin
    .from("campaigns")
    .update({ status: "SENT", sent_at: new Date().toISOString() })
    .eq("id", campaign.id);

  await dispatchWebhooks(orgId, "campaign.sent", {
    campaign_id: campaign.id,
    sent,
    failed,
    skipped,
  });

  revalidatePath(`/org/${orgSlug}/campaigns`);
  redirect(`/org/${orgSlug}/campaigns/${campaign.id}`);
}
