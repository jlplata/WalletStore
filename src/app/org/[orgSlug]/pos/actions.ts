"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembership, requireOrgRole } from "@/lib/authz/session";
import { syncWalletPassesForCustomerProgram } from "@/lib/wallet";
import { dispatchWebhooks } from "@/lib/webhooks/dispatch";

export async function getAssignableBranches(orgId: string) {
  const membership = await requireOrgRole(orgId, "purchase.record");
  const supabase = await createClient();

  let query = supabase
    .from("branches")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (!membership.isPlatformAdmin && membership.branchIds.length > 0) {
    query = query.in("id", membership.branchIds);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getActivePrograms(orgId: string) {
  await requireOrgRole(orgId, "purchase.record");
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("id, name, type")
    .eq("organization_id", orgId)
    .eq("is_active", true);
  return data ?? [];
}

export async function searchCustomers(orgId: string, q: string) {
  await requireOrgRole(orgId, "customer.view");
  if (q.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone, public_code")
    .eq("organization_id", orgId)
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,public_code.ilike.%${q}%`)
    .limit(10);
  return data ?? [];
}

export async function findCustomerByQrToken(orgId: string, qrToken: string) {
  await requireOrgRole(orgId, "customer.view");
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, first_name, last_name")
    .eq("organization_id", orgId)
    .eq("qr_token", qrToken)
    .maybeSingle();
  return data;
}

export async function getCustomerPosState(orgId: string, customerId: string) {
  await requireOrgRole(orgId, "customer.view");
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, last_name, status")
    .eq("id", customerId)
    .eq("organization_id", orgId)
    .single();

  if (!customer) return null;

  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, type, program_rules(stamps_required)")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const { data: enrollments } = await supabase
    .from("customer_program_enrollments")
    .select("program_id, stamps_balance, points_balance")
    .eq("customer_id", customerId);

  const { data: rewards } = await supabase
    .from("customer_rewards")
    .select("id, program_id, status, rewards(name)")
    .eq("customer_id", customerId)
    .eq("status", "AVAILABLE");

  const enrollmentByProgram = new Map((enrollments ?? []).map((e) => [e.program_id, e]));

  const programStates = (programs ?? []).map((p) => {
    const rules = (p.program_rules as unknown as { stamps_required: number | null }[] | null)?.[0];
    const enrollment = enrollmentByProgram.get(p.id);
    const availableRewards = (rewards ?? [])
      .filter((r) => r.program_id === p.id)
      .map((r) => ({ id: r.id, name: (r.rewards as unknown as { name: string } | null)?.name ?? "Recompensa" }));

    return {
      programId: p.id,
      programName: p.name,
      type: p.type,
      stampsRequired: rules?.stamps_required ?? null,
      stampsBalance: enrollment?.stamps_balance ?? 0,
      pointsBalance: enrollment?.points_balance ?? 0,
      availableRewards,
    };
  });

  return { customer, programs: programStates };
}

export async function recordPurchase(
  orgId: string,
  branchId: string,
  customerId: string,
  programId: string,
  amountCents: number
) {
  await requireOrgRole(orgId, "purchase.record");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_purchase_transaction", {
    p_organization_id: orgId,
    p_branch_id: branchId,
    p_customer_id: customerId,
    p_program_id: programId,
    p_amount_cents: amountCents,
    p_idempotency_key: randomUUID(),
  });
  if (error) throw new Error(error.message);
  await syncWalletPassesForCustomerProgram(customerId, programId);
  await dispatchWebhooks(orgId, "purchase.completed", { transaction: data });
  await dispatchWebhooks(orgId, "loyalty.earned", {
    customer_id: customerId,
    program_id: programId,
    stamps_earned: data?.stamps_earned,
    points_earned: data?.points_earned,
  });
  return data;
}

export async function addManualAdjustment(
  orgId: string,
  customerId: string,
  programId: string,
  stampsDelta: number,
  pointsDelta: number,
  reason: string
) {
  await requireOrgRole(orgId, "balance.adjust");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_customer_balance", {
    p_organization_id: orgId,
    p_customer_id: customerId,
    p_program_id: programId,
    p_stamps_delta: stampsDelta,
    p_points_delta: pointsDelta,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  await syncWalletPassesForCustomerProgram(customerId, programId);
  return data;
}

export async function redeemReward(
  orgId: string,
  branchId: string,
  customerRewardId: string,
  customerId: string,
  programId: string
) {
  await requireOrgRole(orgId, "reward.redeem");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_customer_reward", {
    p_customer_reward_id: customerRewardId,
    p_branch_id: branchId,
  });
  if (error) throw new Error(error.message);
  await syncWalletPassesForCustomerProgram(customerId, programId);
  await dispatchWebhooks(orgId, "reward.redeemed", { reward_instance: data });
  return data;
}

export async function getCashierRole(orgId: string) {
  return getOrgMembership(orgId);
}
