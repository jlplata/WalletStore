import { test, expect } from "@playwright/test";

// Flow: sign up -> onboarding (negocio -> marca -> sucursal -> programa ->
// wallet -> qr) -> lands on the org dashboard with a working QR link.
// Requires: a real Supabase project with migrations applied and email
// confirmation either disabled or auto-confirmed for test accounts (see
// docs/testing.md).
test("owner can sign up and create a loyalty program end to end", async ({ page }) => {
  const stamp = Date.now();
  const email = `owner+${stamp}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("Nombre completo").fill("Dueño de Prueba");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("SuperSegura123!");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();

  // In a test environment with auto-confirm enabled, signup redirects
  // straight into the app; otherwise this assertion documents the manual
  // step needed (confirm the email) before continuing.
  await expect(page).toHaveURL(/onboarding|revisa-tu-correo/);

  if (page.url().includes("revisa-tu-correo")) {
    test.skip(true, "Email confirmation is required in this environment; auto-confirm test users to run this flow unattended.");
  }

  await page.getByLabel("Nombre comercial *").fill("Café E2E");
  await page.getByLabel("Teléfono").fill("5555555555");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/.+\/marca/);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/.+\/sucursal/);
  await page.getByLabel("Nombre de la sucursal *").fill("Sucursal Centro");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/.+\/programa/);
  await page.getByLabel("Nombre del programa *").fill("Café Club");
  await page.getByLabel("Recompensa principal *").fill("Café gratis");
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/.+\/wallet/);
  await page.getByRole("link", { name: "Continuar" }).click();

  await expect(page).toHaveURL(/\/onboarding\/.+\/qr/);
  await expect(page.getByText("Tu programa está listo")).toBeVisible();
  const joinUrlInput = page.locator("input[readonly]");
  await expect(joinUrlInput).toHaveValue(/\/join\//);

  await page.getByRole("button", { name: "Ir a mi panel" }).click();
  await expect(page).toHaveURL(/\/org\/.+\/dashboard/);
});
