import { createHmac } from "node:crypto";

/**
 * Signs a webhook payload the same way Stripe/GitHub-style webhooks do:
 * HMAC-SHA256 over the exact JSON string sent as the request body. Kept in
 * its own module (no "server-only" import, no Supabase dependency) so it's
 * trivially unit-testable and reusable if we ever need to verify an
 * incoming signature too.
 */
export function signWebhookPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function buildWebhookBody(eventType: string, payload: Record<string, unknown>, timestamp = new Date()) {
  return JSON.stringify({
    type: eventType,
    data: payload,
    timestamp: timestamp.toISOString(),
  });
}
