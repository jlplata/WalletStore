import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/billing/stripe-provider";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe is the source of truth for subscription state — never trust the
// client. Idempotent: Stripe retries deliveries, and re-processing the same
// event just re-writes the same row (upsert on organization_id).
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripeClient(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.client_reference_id ?? session.metadata?.organization_id;
      const planCode = session.metadata?.plan_code;
      if (!organizationId || !planCode || !session.subscription || !session.customer) break;

      const { data: plan } = await admin.from("plans").select("id").eq("code", planCode).single();
      if (!plan) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

      await admin.from("subscriptions").upsert(
        {
          organization_id: organizationId,
          plan_id: plan.id,
          billing_provider: "stripe",
          provider_customer_id: session.customer as string,
          provider_subscription_id: subscription.id,
          status: mapStripeStatus(subscription.status),
          current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        },
        { onConflict: "organization_id" }
      );

      await admin.from("organizations").update({ status: "ACTIVE" }).eq("id", organizationId);
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata?.organization_id;
      if (!organizationId) break;

      await admin
        .from("subscriptions")
        .update({
          status: mapStripeStatus(subscription.status),
          current_period_start: new Date(subscription.items.data[0].current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.items.data[0].current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq("provider_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}
