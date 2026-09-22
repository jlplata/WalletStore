import { test, expect } from "@playwright/test";

// Flow: a customer who already qualifies for a reward (e.g. seeded by
// scripts/seed-demo.ts, or reached via repeated cashier-pos.spec runs) gets
// it redeemed by a cashier, and a second redemption attempt is rejected —
// this is the concurrency/double-redeem guarantee from
// redeem_customer_reward() (see supabase/migrations).
const cashierEmail = process.env.E2E_CASHIER_EMAIL;
const cashierPassword = process.env.E2E_CASHIER_PASSWORD;
const orgSlug = process.env.E2E_ORG_SLUG;
const customerQuery = process.env.E2E_CUSTOMER_WITH_REWARD_SEARCH;

test.skip(
  !cashierEmail || !cashierPassword || !orgSlug || !customerQuery,
  "Set E2E_CASHIER_EMAIL, E2E_CASHIER_PASSWORD, E2E_ORG_SLUG and E2E_CUSTOMER_WITH_REWARD_SEARCH (a customer who already has an AVAILABLE reward) to run this test."
);

test("a reward can be redeemed once and never twice", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(cashierEmail!);
  await page.getByLabel("Contraseña").fill(cashierPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await page.goto(`/org/${orgSlug}/pos`);
  await page.getByPlaceholder("Buscar por nombre, teléfono o código").fill(customerQuery!);
  await page.getByRole("button").filter({ hasText: customerQuery! }).first().click();

  const redeemButton = page.getByRole("button", { name: "Canjear recompensa" });
  await expect(redeemButton).toBeEnabled();
  await redeemButton.click();

  const rewardOption = page.getByRole("dialog").getByRole("button").first();
  await rewardOption.click();

  await expect(page.getByText("Recompensa canjeada")).toBeVisible();

  // Re-select the same customer and confirm the reward no longer shows as
  // redeemable (redeem_customer_reward() rejects a second redemption).
  await page.goto(`/org/${orgSlug}/pos`);
  await page.getByPlaceholder("Buscar por nombre, teléfono o código").fill(customerQuery!);
  await page.getByRole("button").filter({ hasText: customerQuery! }).first().click();
  await expect(page.getByRole("button", { name: "Canjear recompensa" })).toBeDisabled();
});
