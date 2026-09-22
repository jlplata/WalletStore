# Guía de desarrollo

## Primeros pasos

Ver el `README.md` para la puesta en marcha básica. Este documento cubre
convenciones del código.

## Estructura de carpetas

```
src/app/                    App Router. Rutas por carpeta.
  (marketing)/               Landing pública (grupo de rutas, sin prefijo en URL)
  (auth)/                    Login/signup (grupo de rutas)
  onboarding/                Wizard de alta de negocio (rutas por paso)
  org/[orgSlug]/             App autenticada, todo scoped a una organización
  join/[programId]/          Registro público de clientes
  admin/                     Platform admin
  api/                       Route Handlers (webhooks, wallet, health, qr)
src/components/
  ui/                        Componentes estilo shadcn (escritos a mano, ver DECISIONS.md)
  app/                       Componentes del shell autenticado (sidebar, nav, charts)
  onboarding/                Componentes específicos del wizard
src/lib/
  supabase/                  Clientes (browser/server/admin) + tipos de la BD
  authz/                     Permisos y verificación de rol
  wallet/                    WalletProvider (Apple/Google/Mock)
  billing/                   BillingProvider (Stripe/Mock)
  email/                     EmailProvider (Resend/Consola)
  webhooks/                  Despacho de webhooks salientes
  validations/                Esquemas Zod
supabase/migrations/         Esquema SQL, en orden de aplicación
tests/unit/                  Vitest — funciones puras
tests/integration/           Vitest — contra un Supabase real (auto-skip sin credenciales)
tests/e2e/                   Playwright — flujos completos de UI
```

## Convenciones

- **Server Actions** viven junto a la ruta que las usa (`actions.ts` en la
  misma carpeta), no en un archivo global. Reciben `orgId`/`orgSlug` como
  primeros argumentos vía `.bind(null, ...)` desde el Client Component, y
  siempre llaman `requireOrgRole(orgId, "accion.especifica")` como primera
  línea.
- **Toda mutación de saldo/puntos/sellos pasa por una función RPC de
  Postgres** (`record_purchase_transaction`, `redeem_customer_reward`,
  `adjust_customer_balance`, `refund_purchase_transaction`) — nunca un
  `UPDATE` directo desde TypeScript. Si necesitas una nueva operación sobre
  el ledger, agrega una función SQL nueva en una migración, no la
  implementes en la app.
- **Un componente de formulario = un `actions.ts` con `useActionState`.**
  Ver `src/app/onboarding/business-info-form.tsx` como referencia del
  patrón usado en todo el repo.
- **Nunca uses el cliente `admin` (service role) fuera de un contexto ya
  autorizado.** Revisa `docs/security.md` antes de agregar un nuevo uso.

## Eventos disparados como webhooks salientes

Ver `src/lib/webhooks/dispatch.ts` y `WEBHOOK_EVENT_TYPES` en
`src/app/org/[orgSlug]/settings/webhooks-actions.ts`:

`customer.created`, `customer.wallet_added`, `purchase.completed`,
`loyalty.earned`, `reward.redeemed`, `campaign.sent`.

## Agregar una nueva tabla

1. Migración SQL nueva en `supabase/migrations/` (timestamp posterior al
   último archivo).
2. Política RLS explícita — nunca dejes una tabla sin `ENABLE ROW LEVEL
   SECURITY` (ver el patrón en `..._rls_policies.sql`).
3. Agrega el tipo en `src/lib/supabase/database.types.ts` (`Row`, `Insert`,
   `Update`, `Relationships: []`) — ver `docs/database.md` para
   regenerarlo automáticamente cuando tengas un proyecto real.

## Comandos útiles

```bash
npm run dev          # servidor de desarrollo
npm run lint          # ESLint
npm run typecheck     # TypeScript sin emitir
npm run test          # Vitest (unit + integration, esta última auto-skip)
npm run test:e2e      # Playwright (requiere app corriendo + Supabase real)
npm run build          # build de producción
npx next typegen       # regenera los tipos de rutas de Next.js (después de agregar una ruta nueva)
```
