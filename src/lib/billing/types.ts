export interface CheckoutSessionInput {
  organizationId: string;
  planCode: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}

export interface PortalSessionInput {
  organizationId: string;
  returnUrl: string;
}

/**
 * BillingProvider abstracts subscription checkout/management so the app
 * never talks to Stripe directly. StripeBillingProvider (real) is used
 * automatically when STRIPE_SECRET_KEY is configured; MockBillingProvider
 * otherwise — it never charges anything and the UI labels it clearly.
 * A MercadoPagoBillingProvider can implement this same interface later
 * without touching any calling code (see DECISIONS.md).
 */
export interface BillingProvider {
  readonly mode: "live" | "mock";
  createCheckoutSession(input: CheckoutSessionInput): Promise<{ url: string }>;
  createPortalSession(input: PortalSessionInput): Promise<{ url: string }>;
}
