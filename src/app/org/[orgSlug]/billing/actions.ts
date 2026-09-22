"use server";

import { redirect } from "next/navigation";
import { requireOrgRole, requireUser } from "@/lib/authz/session";
import { getBillingProvider } from "@/lib/billing";

export async function startCheckoutAction(orgId: string, orgSlug: string, planCode: string) {
  await requireOrgRole(orgId, "organization.billing.manage");
  const user = await requireUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { url } = await getBillingProvider().createCheckoutSession({
    organizationId: orgId,
    planCode,
    successUrl: `${appUrl}/org/${orgSlug}/billing?checkout=success`,
    cancelUrl: `${appUrl}/org/${orgSlug}/billing?checkout=cancelled`,
    customerEmail: user.email ?? undefined,
  });

  redirect(url);
}

export async function openPortalAction(orgId: string, orgSlug: string) {
  await requireOrgRole(orgId, "organization.billing.manage");
  const provider = getBillingProvider();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (provider.mode === "mock") {
    redirect(`/org/${orgSlug}/billing?portal=mock`);
  }

  const { url } = await provider.createPortalSession({
    organizationId: orgId,
    returnUrl: `${appUrl}/org/${orgSlug}/billing`,
  });

  redirect(url);
}
