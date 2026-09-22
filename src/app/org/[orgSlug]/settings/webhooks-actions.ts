"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/authz/session";

export type WebhookFormState = { error?: string; secret?: string };

export const WEBHOOK_EVENT_TYPES = [
  "customer.created",
  "customer.wallet_added",
  "purchase.completed",
  "loyalty.earned",
  "reward.redeemed",
  "campaign.sent",
] as const;

const schema = z.object({
  url: z.string().url("Ingresa una URL válida (https://...)."),
  eventTypes: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1, "Selecciona al menos un evento."),
});

export async function createWebhookAction(
  orgId: string,
  orgSlug: string,
  _prevState: WebhookFormState,
  formData: FormData
): Promise<WebhookFormState> {
  await requireOrgRole(orgId, "webhook.manage");

  const parsed = schema.safeParse({
    url: formData.get("url"),
    eventTypes: formData.getAll("eventTypes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const secret = randomBytes(24).toString("hex");
  const supabase = await createClient();
  const { error } = await supabase.from("webhooks").insert({
    organization_id: orgId,
    url: parsed.data.url,
    secret,
    event_types: parsed.data.eventTypes,
  });

  if (error) return { error: error.message };
  revalidatePath(`/org/${orgSlug}/settings`);
  return { secret };
}

export async function toggleWebhookActiveAction(
  orgId: string,
  orgSlug: string,
  webhookId: string,
  nextActive: boolean
) {
  await requireOrgRole(orgId, "webhook.manage");
  const supabase = await createClient();
  await supabase
    .from("webhooks")
    .update({ is_active: nextActive })
    .eq("id", webhookId)
    .eq("organization_id", orgId);
  revalidatePath(`/org/${orgSlug}/settings`);
}

export async function deleteWebhookAction(orgId: string, orgSlug: string, webhookId: string) {
  await requireOrgRole(orgId, "webhook.manage");
  const supabase = await createClient();
  await supabase.from("webhooks").delete().eq("id", webhookId).eq("organization_id", orgId);
  revalidatePath(`/org/${orgSlug}/settings`);
}
