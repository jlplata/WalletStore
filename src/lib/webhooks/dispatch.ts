import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { signWebhookPayload, buildWebhookBody } from "./sign";

/**
 * Dispatches an event to every active webhook an organization has
 * subscribed to it, HMAC-signing the payload with the webhook's own secret
 * (so the receiver can verify authenticity — see docs/webhooks.md). This is
 * the n8n-compatible automation surface (section 21 of the product spec).
 *
 * Delivery is best-effort and synchronous: one attempt, no retry queue yet
 * (see TODO.md — `webhook_deliveries.attempts` is already shaped for a
 * future retry worker). Called from Server Actions right after the RPC
 * that produced the event succeeds, mirroring how wallet sync is triggered.
 */
export async function dispatchWebhooks(
  organizationId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const admin = createAdminClient();

  const { data: webhooks } = await admin
    .from("webhooks")
    .select("id, url, secret, event_types")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  const targets = (webhooks ?? []).filter(
    (w) => w.event_types.includes(eventType) || w.event_types.includes("*")
  );
  if (targets.length === 0) return;

  const body = buildWebhookBody(eventType, payload);

  await Promise.all(
    targets.map(async (webhook) => {
      const signature = signWebhookPayload(webhook.secret, body);
      let responseStatus: number | null = null;
      let status: "SUCCESS" | "FAILED" = "FAILED";

      try {
        const res = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WalletStore-Event": eventType,
            "X-WalletStore-Signature": `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        responseStatus = res.status;
        status = res.ok ? "SUCCESS" : "FAILED";
      } catch (err) {
        console.error(`[webhooks] delivery failed for ${webhook.url}:`, err);
      }

      await admin.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        event_type: eventType,
        payload: JSON.parse(body),
        status,
        attempts: 1,
        last_attempted_at: new Date().toISOString(),
        response_status: responseStatus,
      });
    })
  );
}
