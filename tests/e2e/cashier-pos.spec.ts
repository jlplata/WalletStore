import { test, expect } from "@playwright/test";

// Flow: cashier logs in -> Modo Caja -> searches a customer manually
// (camera QR scanning isn't automatable in headless Chromium without a
// fake video device, so this test exercises the manual-search fallback
// that's always available) -> registers a purchase -> the customer's
// progress increases on screen.
const cashierEmail = process.env.E2E_CASHIER_EMAIL;
const cashierPassword = process.env.E2E_CASHIER_PASSWORD;
const orgSlug = process.env.E2E_ORG_SLUG;
const customerQuery = process.env.E2E_CUSTOMER_SEARCH; // e.g. a phone number

test.skip(
  !cashierEmail || !cashierPassword || !orgSlug || !customerQuery,
  "Set E2E_CASHIER_EMAIL, E2E_CASHIER_PASSWORD, E2E_ORG_SLUG and E2E_CUSTOMER_SEARCH to run this test."
);

test("cashier can find a customer and register a purchase from the POS", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(cashierEmail!);
  await page.getByLabel("Contraseña").fill(cashierPassword!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await page.goto(`/org/${orgSlug}/pos`);
  await page.getByPlaceholder("Buscar por nombre, teléfono o código").fill(customerQuery!);
  await page.getByRole("button").filter({ hasText: customerQuery! }).first().click();

  await expect(page.getByRole("button", { name: "Registrar compra" })).toBeVisible();

  const balanceBefore = await page.locator("p.text-3xl.font-bold").innerText();

  await page.getByRole("button", { name: "Registrar compra" }).click();
  await page.getByPlaceholder("$0.00").fill("100");
  await page.getByRole("button", { name: "Confirmar" }).click();

  await expect(page.getByText("Compra registrada")).toBeVisible();
  await expect(page.locator("p.text-3xl.font-bold")).not.toHaveText(balanceBefore);
});
