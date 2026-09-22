import "server-only";
import { StripeBillingProvider } from "./stripe-provider";
import { MockBillingProvider } from "./mock-provider";
import type { BillingProvider } from "./types";

let cached: BillingProvider | null = null;

export function getBillingProvider(): BillingProvider {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key && key.length > 0 ? new StripeBillingProvider(key) : new MockBillingProvider();
  return cached;
}

export type { BillingProvider, CheckoutSessionInput, PortalSessionInput } from "./types";
