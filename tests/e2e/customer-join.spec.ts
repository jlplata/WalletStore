import { test, expect } from "@playwright/test";

// Flow: customer opens a program's join link -> registers (no password) ->
// sees "tu tarjeta está lista" with working Add to Wallet links.
// Requires PROGRAM_ID env pointing at an existing, active program (create
// one via the owner-onboarding flow or the demo seed first).
const programId = process.env.E2E_PROGRAM_ID;

test.skip(!programId, "Set E2E_PROGRAM_ID to an existing program id to run this test.");

test("a customer can register from the public join page and gets wallet links", async ({ page }) => {
  const stamp = Date.now();

  await page.goto(`/join/${programId}`);
  await expect(page.getByRole("heading", { name: /Regístrate/ })).toBeVisible();

  await page.getByLabel("Nombre *").fill("Cliente Prueba");
  await page.getByLabel("WhatsApp / Teléfono").fill(`555${String(stamp).slice(-7)}`);
  await page.getByLabel("Acepto los").check();
  await page.getByRole("button", { name: "Obtener mi tarjeta" }).click();

  await expect(page).toHaveURL(/\/join\/.+\/lista/);
  await expect(page.getByText("Tu tarjeta está lista")).toBeVisible();
  await expect(page.getByRole("link", { name: /Add to Apple Wallet/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Add to Google Wallet/ })).toBeVisible();
});
