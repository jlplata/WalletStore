/**
 * Seeds a demo organization ("Café Demo") with a realistic loyalty program,
 * branches, staff and 30 customers with historical activity — so a fresh
 * Supabase project can show a populated dashboard immediately (product
 * spec, section 32). Every row created here is marked as demo data:
 * `organizations.is_demo = true`, and every seeded user's email starts
 * with `demo-`.
 *
 * NEVER run this against a project with real customer data — it inserts
 * directly via the service-role client, bypassing RLS, exactly like the
 * app's own webhook/wallet-issuance code paths do.
 *
 * Usage:
 *   npm run seed:demo
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
 * .env.local (or the environment).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in first."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const STAFF = [
  { email: "demo-owner@walletstore.mx", name: "Ana Torres", role: "ORGANIZATION_OWNER" as const },
  { email: "demo-admin@walletstore.mx", name: "Luis Fernández", role: "ORGANIZATION_ADMIN" as const },
  { email: "demo-gerente-centro@walletstore.mx", name: "Paola Ruiz", role: "BRANCH_MANAGER" as const },
  { email: "demo-cajero-centro@walletstore.mx", name: "Jorge Medina", role: "CASHIER" as const },
  { email: "demo-cajero-norte@walletstore.mx", name: "Sofía Vargas", role: "CASHIER" as const },
];
const DEMO_PASSWORD = "DemoWalletStore123!";

const FIRST_NAMES = [
  "María", "José", "Guadalupe", "Juan", "Fernanda", "Carlos", "Valentina", "Diego",
  "Camila", "Miguel", "Ximena", "Andrés", "Renata", "Sofía", "Emiliano", "Daniela",
  "Santiago", "Regina", "Leonardo", "Paula", "Mateo", "Isabella", "Emilio", "Victoria",
  "Alejandro", "Natalia", "Gael", "Constanza", "Iker", "Luciana",
];
const LAST_NAMES = ["García", "Martínez", "López", "Hernández", "González", "Pérez", "Sánchez", "Ramírez"];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log("Seeding demo organization...");

  // 1. Organization
  const { data: existing } = await admin.from("organizations").select("id").eq("slug", "cafe-demo").maybeSingle();
  if (existing) {
    console.error("An organization with slug 'cafe-demo' already exists. Delete it first if you want to reseed.");
    process.exit(1);
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: "Café Demo",
      slug: "cafe-demo",
      category: "Cafetería",
      country: "MX",
      currency: "MXN",
      status: "ACTIVE",
      is_demo: true,
      brand_primary_color: "#6b3f2a",
      brand_secondary_color: "#ffffff",
    })
    .select("id")
    .single();
  if (orgError || !org) throw orgError;
  console.log(`Organization created: ${org.id}`);

  // 2. Staff (Auth users + memberships)
  const staffIds: Record<string, string> = {};
  for (const staff of STAFF) {
    const { data: user, error } = await admin.auth.admin.createUser({
      email: staff.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: staff.name },
    });
    if (error || !user.user) throw error;
    staffIds[staff.email] = user.user.id;

    await admin.from("organization_members").insert({
      organization_id: org.id,
      user_id: user.user.id,
      role: staff.role,
    });
  }
  console.log(`Created ${STAFF.length} staff accounts (password: ${DEMO_PASSWORD}).`);

  // 3. Branches
  const { data: branches, error: branchError } = await admin
    .from("branches")
    .insert([
      { organization_id: org.id, name: "Sucursal Centro", address: "Av. Juárez 123, CDMX", phone: "5555550001" },
      { organization_id: org.id, name: "Sucursal Norte", address: "Blvd. Norte 456, CDMX", phone: "5555550002" },
    ])
    .select("id, name");
  if (branchError || !branches) throw branchError;

  await admin
    .from("organization_members")
    .update({ branch_ids: [branches[0].id] })
    .eq("organization_id", org.id)
    .in("user_id", [staffIds["demo-gerente-centro@walletstore.mx"], staffIds["demo-cajero-centro@walletstore.mx"]]);
  await admin
    .from("organization_members")
    .update({ branch_ids: [branches[1].id] })
    .eq("organization_id", org.id)
    .eq("user_id", staffIds["demo-cajero-norte@walletstore.mx"]);
  console.log(`Created ${branches.length} branches.`);

  // 4. Program + rules + reward
  const { data: program, error: programError } = await admin
    .from("programs")
    .insert({
      organization_id: org.id,
      name: "Café Club",
      slug: "cafe-club",
      type: "STAMPS",
      reward_headline: "Bebida gratis",
      primary_color: "#6b3f2a",
      secondary_color: "#ffffff",
    })
    .select("id")
    .single();
  if (programError || !program) throw programError;

  await admin.from("program_rules").insert({
    program_id: program.id,
    organization_id: org.id,
    stamps_required: 10,
    stamps_per_purchase: 1,
    min_purchase_amount_cents: 0,
  });

  const { data: reward, error: rewardError } = await admin
    .from("rewards")
    .insert({
      organization_id: org.id,
      program_id: program.id,
      name: "Bebida gratis",
      description: "Cualquier bebida caliente o fría de tamaño mediano.",
      type: "FREE_ITEM",
      cost_stamps: 10,
    })
    .select("id")
    .single();
  if (rewardError || !reward) throw rewardError;
  console.log(`Program "Café Club" created with reward "Bebida gratis".`);

  // 5. Customers with historical activity
  const cashierIds = [staffIds["demo-cajero-centro@walletstore.mx"], staffIds["demo-cajero-norte@walletstore.mx"]];

  for (let i = 0; i < 30; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
    const joinedDaysAgo = randomInt(1, 90);
    const publicCode = `DEMO${String(i + 1).padStart(3, "0")}`;

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert({
        organization_id: org.id,
        public_code: publicCode,
        first_name: firstName,
        last_name: lastName,
        phone: `55${String(10000000 + i * 137).slice(0, 8)}`,
        email: i % 3 === 0 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com` : null,
        marketing_consent: i % 2 === 0,
        terms_accepted_at: daysAgo(joinedDaysAgo).toISOString(),
        terms_version: "v1",
        consent_source: "seed_demo",
        created_at: daysAgo(joinedDaysAgo).toISOString(),
      })
      .select("id")
      .single();
    if (customerError || !customer) throw customerError;

    await admin.from("customer_consents").insert([
      {
        customer_id: customer.id,
        organization_id: org.id,
        consent_type: "TERMS",
        granted: true,
        version: "v1",
        source: "seed_demo",
      },
      {
        customer_id: customer.id,
        organization_id: org.id,
        consent_type: "MARKETING",
        granted: i % 2 === 0,
        version: "v1",
        source: "seed_demo",
      },
    ]);

    const visits = randomInt(1, 14);
    let stampsBalance = 0;
    let lifetimeStamps = 0;
    let totalSpendCents = 0;
    let lastVisitAt = daysAgo(joinedDaysAgo);
    const branchForCustomer = branches[i % branches.length];
    const cashierForCustomer = cashierIds[i % cashierIds.length];

    for (let v = 0; v < visits; v++) {
      const visitDaysAgo = Math.max(joinedDaysAgo - v * randomInt(3, 10), 0);
      const visitDate = daysAgo(visitDaysAgo);
      const amountCents = randomInt(4500, 15000);
      totalSpendCents += amountCents;

      const { data: tx } = await admin
        .from("purchase_transactions")
        .insert({
          organization_id: org.id,
          branch_id: branchForCustomer.id,
          customer_id: customer.id,
          program_id: program.id,
          staff_user_id: cashierForCustomer,
          amount_cents: amountCents,
          stamps_earned: 1,
          idempotency_key: randomUUID(),
          created_at: visitDate.toISOString(),
        })
        .select("id")
        .single();

      await admin.from("loyalty_ledger").insert({
        organization_id: org.id,
        customer_id: customer.id,
        program_id: program.id,
        branch_id: branchForCustomer.id,
        type: "STAMP_EARN",
        stamps_delta: 1,
        purchase_transaction_id: tx?.id,
        staff_user_id: cashierForCustomer,
        description: "Compra registrada (demo)",
        idempotency_key: `${tx?.id}:purchase`,
        created_at: visitDate.toISOString(),
      });

      stampsBalance += 1;
      lifetimeStamps += 1;
      if (visitDate > lastVisitAt) lastVisitAt = visitDate;

      // Every time the customer hits 10 stamps, unlock a reward instance;
      // redeem about half of them for a realistic mix of AVAILABLE/REDEEMED.
      if (stampsBalance === 10) {
        const redeem = Math.random() > 0.5;
        const { data: rewardInstance } = await admin
          .from("customer_rewards")
          .insert({
            organization_id: org.id,
            customer_id: customer.id,
            program_id: program.id,
            reward_id: reward.id,
            status: redeem ? "REDEEMED" : "AVAILABLE",
            redemption_code: randomUUID().slice(0, 8).toUpperCase(),
            unlocked_at: visitDate.toISOString(),
            redeemed_at: redeem ? visitDate.toISOString() : null,
            redeemed_by_staff_id: redeem ? cashierForCustomer : null,
            redeemed_branch_id: redeem ? branchForCustomer.id : null,
          })
          .select("id")
          .single();

        if (redeem) {
          await admin.from("loyalty_ledger").insert({
            organization_id: org.id,
            customer_id: customer.id,
            program_id: program.id,
            branch_id: branchForCustomer.id,
            type: "REDEMPTION",
            stamps_delta: -10,
            reward_instance_id: rewardInstance?.id,
            staff_user_id: cashierForCustomer,
            description: "Canje de recompensa (demo)",
            idempotency_key: `redeem:${rewardInstance?.id}`,
            created_at: visitDate.toISOString(),
          });
          stampsBalance = 0;
        }
      }
    }

    await admin.from("customer_program_enrollments").insert({
      customer_id: customer.id,
      program_id: program.id,
      organization_id: org.id,
      stamps_balance: stampsBalance,
      lifetime_stamps: lifetimeStamps,
      visits_count: visits,
      total_spend_cents: totalSpendCents,
      last_visit_at: lastVisitAt.toISOString(),
      enrolled_at: daysAgo(joinedDaysAgo).toISOString(),
    });

    // Half the customers "added" the card to a (mock) wallet, mirroring
    // what issueWalletPass() would create for a real customer.
    if (i % 2 === 0) {
      await admin.from("wallet_passes").insert({
        organization_id: org.id,
        customer_id: customer.id,
        program_id: program.id,
        platform: i % 4 === 0 ? "APPLE" : "GOOGLE",
        provider_mode: "MOCK",
        serial_number: randomUUID(),
        auth_token: randomUUID(),
        status: "ACTIVE",
        last_pushed_at: lastVisitAt.toISOString(),
      });
    }
  }

  console.log("Seeded 30 demo customers with purchase history, rewards and mock wallet passes.");
  console.log("\nDone. Log in with any of:");
  for (const s of STAFF) console.log(`  ${s.email} / ${DEMO_PASSWORD} (${s.role})`);
  console.log(`\nOrganization: /org/cafe-demo/dashboard`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
