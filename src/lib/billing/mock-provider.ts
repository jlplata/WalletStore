import "server-only";
import type { BillingProvider, CheckoutSessionInput, PortalSessionInput } from "./types";

/**
 * Used automatically when STRIPE_SECRET_KEY isn't configured. Never charges
 * anything — "checkout" just routes to a same-app confirmation page that
 * activates the plan directly (via activateMockPlanAction) and says
 * explicitly that no real payment happened.
 */
export class MockBillingProvider implements BillingProvider {
  readonly mode = "mock" as const;

  async createCheckoutSession(input: CheckoutSessionInput) {
    const params = new URLSearchParams({
      organizationId: input.organizationId,
      plan: input.planCode,
      returnTo: input.successUrl,
    });
    return { url: `/billing/mock-checkout?${params.toString()}` };
  }

  async createPortalSession(input: PortalSessionInput) {
    return { url: input.returnUrl };
  }
}
