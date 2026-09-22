import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { signWebhookPayload, buildWebhookBody } from "@/lib/webhooks/sign";

describe("buildWebhookBody", () => {
  it("wraps the event type, payload and timestamp", () => {
    const ts = new Date("2026-01-01T00:00:00.000Z");
    const body = buildWebhookBody("purchase.completed", { customer_id: "abc" }, ts);
    expect(JSON.parse(body)).toEqual({
      type: "purchase.completed",
      data: { customer_id: "abc" },
      timestamp: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("signWebhookPayload", () => {
  it("produces a deterministic HMAC-SHA256 hex digest matching a manual computation", () => {
    const secret = "test-secret";
    const body = '{"type":"reward.redeemed"}';
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    expect(signWebhookPayload(secret, body)).toBe(expected);
  });

  it("produces a different signature for a different secret", () => {
    const body = '{"type":"reward.redeemed"}';
    expect(signWebhookPayload("secret-a", body)).not.toBe(signWebhookPayload("secret-b", body));
  });

  it("produces a different signature for a different body", () => {
    const secret = "test-secret";
    expect(signWebhookPayload(secret, "a")).not.toBe(signWebhookPayload(secret, "b"));
  });
});
