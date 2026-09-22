import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WalletPassContent } from "./types";

export async function getWalletPassContent(
  customerId: string,
  programId: string
): Promise<WalletPassContent | null> {
  const admin = createAdminClient();

  const { data: customer } = await admin
    .from("customers")
    .select("first_name, last_name, qr_token, organization_id")
    .eq("id", customerId)
    .single();
  if (!customer) return null;

  const { data: program } = await admin
    .from("programs")
    .select("id, name, type, reward_headline, organization_id, program_rules(stamps_required)")
    .eq("id", programId)
    .single();
  if (!program) return null;

  const { data: org } = await admin
    .from("organizations")
    .select("id, name, brand_primary_color, brand_secondary_color, logo_url")
    .eq("id", program.organization_id)
    .single();
  if (!org) return null;

  const { data: enrollment } = await admin
    .from("customer_program_enrollments")
    .select("stamps_balance, points_balance")
    .eq("customer_id", customerId)
    .eq("program_id", programId)
    .maybeSingle();

  const rules = (program.program_rules as unknown as { stamps_required: number | null }[] | null)?.[0];

  return {
    organization: {
      id: org.id,
      name: org.name,
      primaryColor: org.brand_primary_color,
      secondaryColor: org.brand_secondary_color,
      logoUrl: org.logo_url,
    },
    program: {
      id: program.id,
      name: program.name,
      type: program.type,
      rewardHeadline: program.reward_headline,
      stampsRequired: rules?.stamps_required ?? null,
    },
    customer: {
      firstName: customer.first_name,
      lastName: customer.last_name,
      qrToken: customer.qr_token,
    },
    balance: {
      stamps: enrollment?.stamps_balance ?? 0,
      points: enrollment?.points_balance ?? 0,
    },
    updatedAt: new Date().toISOString(),
  };
}
