import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Runs against a REAL Supabase project (migrations applied). Skipped
// automatically when the env vars aren't set, so `npm test` stays green
// without a database — but this suite is what actually proves the RLS
// model in supabase/migrations does its job. Run it locally or in CI with
// a disposable Supabase project before trusting a schema change.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = !!url && !!anonKey && !!serviceKey;

describe.skipIf(!canRun)("tenant isolation and ledger integrity (live Supabase)", () => {
  const admin = canRun ? createClient(url!, serviceKey!) : null!;
  let orgAId: string;
  let orgBId: string;
  let userAEmail: string;
  const userAPassword = "TestPassword123!";
  let userAId: string;

  beforeAll(async () => {
    if (!canRun) return;
    userAEmail = `test-tenant-${randomUUID()}@example.com`;

    const { data: userA, error: userAErr } = await admin.auth.admin.createUser({
      email: userAEmail,
      password: userAPassword,
      email_confirm: true,
    });
    if (userAErr || !userA.user) throw userAErr;
    userAId = userA.user.id;

    const { data: orgA } = await admin
      .from("organizations")
      .insert({ name: "Org A", slug: `org-a-${randomUUID()}` })
      .select("id")
      .single();
    orgAId = orgA!.id;
    await admin.from("organization_members").insert({
      organization_id: orgAId,
      user_id: userAId,
      role: "ORGANIZATION_OWNER",
    });

    const { data: orgB } = await admin
      .from("organizations")
      .insert({ name: "Org B", slug: `org-b-${randomUUID()}` })
      .select("id")
      .single();
    orgBId = orgB!.id;

    await admin.from("customers").insert({
      organization_id: orgBId,
      public_code: "TESTB01",
      first_name: "Cliente B",
      phone: "5599999999",
    });
  });

  afterAll(async () => {
    if (!canRun) return;
    await admin.from("organizations").delete().in("id", [orgAId, orgBId]);
    await admin.auth.admin.deleteUser(userAId);
  });

  it("prevents a member of org A from reading org B's customers", async () => {
    const asUserA = createClient(url!, anonKey!);
    await asUserA.auth.signInWithPassword({ email: userAEmail, password: userAPassword });

    const { data, error } = await asUserA.from("customers").select("*").eq("organization_id", orgBId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("prevents an anonymous client from reading any customers", async () => {
    const anon = createClient(url!, anonKey!);
    const { data } = await anon.from("customers").select("*").limit(1);
    expect(data).toEqual([]);
  });
});

describe.skipIf(!canRun)("loyalty ledger idempotency (live Supabase)", () => {
  const admin = canRun ? createClient(url!, serviceKey!) : null!;
  let orgId: string;
  let branchId: string;
  let programId: string;
  let customerId: string;
  let ownerId: string;
  const ownerEmail = `test-ledger-${randomUUID()}@example.com`;

  beforeAll(async () => {
    if (!canRun) return;

    const { data: user } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: "TestPassword123!",
      email_confirm: true,
    });
    ownerId = user!.user!.id;

    const { data: org } = await admin
      .from("organizations")
      .insert({ name: "Ledger Test Org", slug: `ledger-org-${randomUUID()}` })
      .select("id")
      .single();
    orgId = org!.id;

    await admin.from("organization_members").insert({
      organization_id: orgId,
      user_id: ownerId,
      role: "ORGANIZATION_OWNER",
    });

    const { data: branch } = await admin
      .from("branches")
      .insert({ organization_id: orgId, name: "Sucursal Test" })
      .select("id")
      .single();
    branchId = branch!.id;

    const { data: program } = await admin
      .from("programs")
      .insert({ organization_id: orgId, name: "Test Club", slug: "test-club", type: "STAMPS" })
      .select("id")
      .single();
    programId = program!.id;

    await admin.from("program_rules").insert({
      program_id: programId,
      organization_id: orgId,
      stamps_required: 10,
      stamps_per_purchase: 1,
    });

    const { data: customer } = await admin
      .from("customers")
      .insert({ organization_id: orgId, public_code: "LEDGER01", first_name: "Cliente Ledger" })
      .select("id")
      .single();
    customerId = customer!.id;
  });

  afterAll(async () => {
    if (!canRun) return;
    await admin.from("organizations").delete().eq("id", orgId);
    await admin.auth.admin.deleteUser(ownerId);
  });

  it("does not double-credit a purchase retried with the same idempotency key", async () => {
    // record_purchase_transaction() requires auth.uid() (it checks the
    // caller's own org role), which the service-role client never sets —
    // so this must run as the authenticated owner, exactly like the app does.
    const asOwner = createClient(url!, anonKey!);
    await asOwner.auth.signInWithPassword({ email: ownerEmail, password: "TestPassword123!" });

    const idempotencyKey = `test-${randomUUID()}`;

    for (let i = 0; i < 2; i++) {
      const { error } = await asOwner.rpc("record_purchase_transaction", {
        p_organization_id: orgId,
        p_branch_id: branchId,
        p_customer_id: customerId,
        p_program_id: programId,
        p_amount_cents: 5000,
        p_idempotency_key: idempotencyKey,
      });
      expect(error).toBeNull();
    }

    const { data: enrollment } = await admin
      .from("customer_program_enrollments")
      .select("stamps_balance")
      .eq("customer_id", customerId)
      .eq("program_id", programId)
      .single();

    expect(enrollment?.stamps_balance).toBe(1);
  });
});
