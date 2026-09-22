# Estrategia de pruebas

## Unit tests (`tests/unit/`, Vitest)

Corren siempre, sin dependencias externas: `npm run test`. Cubren lógica
pura — validaciones Zod, formateo, firma de webhooks, la matriz de
permisos. No tocan Supabase ni red.

## Integration tests (`tests/integration/`, Vitest)

Corren contra un proyecto Supabase real con las migraciones aplicadas.
**Se auto-saltan** (`describe.skipIf`) si `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` no apuntan a
un proyecto real — así `npm run test` nunca falla en un entorno sin base de
datos, pero tampoco miente: si quieres la prueba real, configura esas
variables (usa un proyecto Supabase desechable, nunca producción) y
vuelve a correr.

Cubren exactamente los invariantes que RLS/las funciones RPC prometen:

- `tests/integration/tenant-isolation.test.ts`:
  - un miembro de la Organización A no puede leer clientes de la
    Organización B (aunque intente pedirlo directamente);
  - un cliente anónimo no puede leer la tabla de clientes;
  - `record_purchase_transaction()` llamado dos veces con la misma
    `idempotency_key` no duplica el crédito de sellos.

Estas pruebas crean y borran sus propios datos (usuarios, organizaciones)
en cada corrida — nunca corras esta suite contra un proyecto con datos
reales.

## E2E (`tests/e2e/`, Playwright)

`npm run test:e2e`. Requieren la app corriendo (`npm run dev`, o el
`webServer` de `playwright.config.ts` la levanta automáticamente) contra un
Supabase real con las migraciones aplicadas. Cubren los 4 flujos críticos
del producto (sección "Testing" del spec):

| Archivo | Flujo |
|---|---|
| `owner-onboarding.spec.ts` | Dueño: signup → onboarding → crea programa → obtiene QR |
| `customer-join.spec.ts` | Cliente: abre QR → se registra → obtiene enlaces de Wallet |
| `cashier-pos.spec.ts` | Cajero: login → busca cliente → registra compra → saldo actualizado |
| `reward-redemption.spec.ts` | Cliente cumple condición → cajero canjea → no se puede canjear dos veces |

Algunos requieren variables de entorno adicionales para apuntar a datos ya
existentes (ver el comentario al inicio de cada archivo:
`E2E_PROGRAM_ID`, `E2E_CASHIER_EMAIL`, `E2E_CASHIER_PASSWORD`,
`E2E_ORG_SLUG`, `E2E_CUSTOMER_SEARCH`, `E2E_CUSTOMER_WITH_REWARD_SEARCH`) —
el seed de demo (`scripts/seed-demo.ts`) es la forma más rápida de tener
esos datos listos.

Si tu proyecto Supabase exige confirmación de correo, `owner-onboarding.spec.ts`
se detecta a sí mismo y se salta con un mensaje explicando cómo
auto-confirmar usuarios de prueba (Authentication → Providers → Email →
desactivar "Confirm email", solo en un proyecto de pruebas).

## Qué NO se prueba automáticamente todavía

- Los Route Handlers del web service de PassKit
  (`/api/wallet/apple/v1/...`) — probarlos de extremo a extremo requiere
  certificados Apple reales y un dispositivo iOS. Se probaron manualmente
  durante el desarrollo siguiendo `docs/apple-wallet-setup.md#8-probar`.
- Los webhooks de Stripe — usa `stripe listen --forward-to
  localhost:3000/api/webhooks/stripe` y dispara eventos de prueba
  (`stripe trigger checkout.session.completed`) manualmente.

## CI

`.github/workflows/ci.yml` corre lint, typecheck, `npm run test` (unit;
integration se auto-skip sin secretos configurados en el repo) y build en
cada PR. E2E no corre en CI por defecto (requiere una base de datos y
usuarios de prueba vivos) — córrelo localmente o agrega un job separado
con un proyecto Supabase de pruebas dedicado si lo necesitas.
