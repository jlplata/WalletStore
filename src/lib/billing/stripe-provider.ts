import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BillingProvider, CheckoutSessionInput, PortalSessionInput } from "./types";

export class StripeBillingProvider implements BillingProvider {
  readonly mode = "live" as const;
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(input: CheckoutSessionInput) {
    const admin = createAdminClient();

    const { data: plan } = await admin
      .from("plans")
      .select("id, stripe_price_id_monthly")
      .eq("code", input.planCode)
      .single();

    if (!plan?.stripe_price_id_monthly) {
      throw new Error(
        `El plan ${input.planCode} no tiene un precio de Stripe configurado. Ver docs/billing.md.`
      );
    }

    const { data: org } = await admin
      .from("organizations")
      .select("id")
      .eq("id", input.organizationId)
      .single();
    if (!org) throw new Error("Organización no encontrada.");

    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: plan.stripe_price_id_monthly, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer: existingSub?.provider_customer_id ?? undefined,
      customer_email: existingSub?.provider_customer_id ? undefined : input.customerEmail,
      client_reference_id: input.organizationId,
      subscription_data: {
        metadata: { organization_id: input.organizationId, plan_code: input.planCode },
      },
      metadata: { organization_id: input.organizationId, plan_code: input.planCode },
    });

    if (!session.url) throw new Error("Stripe no devolvió una URL de checkout.");
    return { url: session.url };
  }

  async createPortalSession(input: PortalSessionInput) {
    const admin = createAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("organization_id", input.organizationId)
      .maybeSingle();

    if (!sub?.provider_customer_id) {
      throw new Error("Esta organización todavía no tiene una suscripción de Stripe.");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.provider_customer_id,
      return_url: input.returnUrl,
    });

    return { url: session.url };
  }
}

export function getStripeClient(secretKey: string) {
  return new Stripe(secretKey);
}
