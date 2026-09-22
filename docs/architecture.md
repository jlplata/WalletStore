# Arquitectura

Ver también `IMPLEMENTATION_PLAN.md` (visión general) y `docs/database.md`
(modelo de datos detallado).

## Visión general

```
Browser
  │
  ├── Marketing público (/)
  ├── Registro de clientes (/join/[programId])
  ├── App autenticada (/org/[orgSlug]/...)
  └── Platform admin (/admin)
  │
  ▼
Next.js (App Router) — Server Components, Server Actions, Route Handlers
  │  - Autenticación: Supabase Auth (cookies httpOnly, refrescadas por proxy.ts)
  │  - Autorización: requireOrgRole()/requirePlatformAdmin() en cada acción
  │  - Motor de lealtad: SIEMPRE vía funciones RPC de Postgres (nunca
  │    updates directos de saldo desde la app)
  ▼
Supabase PostgreSQL
  │  - RLS en todas las tablas de negocio
  │  - Funciones SECURITY DEFINER para escrituras atómicas/sensibles
  │  - Ledger inmutable (loyalty_ledger) como fuente de verdad
  ▼
Integraciones externas (adaptadores desacoplados, mock cuando faltan
credenciales — nunca fingidas como reales)
  - WalletProvider: Apple (PassKit real) / Google (Wallet API real) / Mock
  - BillingProvider: Stripe (real) / Mock
  - EmailProvider: Resend (real) / Consola (dev)
  - Webhooks salientes firmados con HMAC (compatible con n8n)
```

## Multi-tenancy

Toda tabla de negocio tiene `organization_id`. El aislamiento se garantiza
en dos capas independientes:

1. **Servidor (defensa primaria efectiva para la UX):** `requireOrgRole()`
   deriva la membresía del usuario autenticado desde la sesión, nunca del
   `organization_id` que llegue en la URL/formulario sin verificar.
2. **Postgres RLS (defensa que no se puede saltar):** cada tabla tiene
   políticas basadas en `is_org_member()`/`has_org_role()` — incluso si un
   endpoint olvidara el chequeo de la capa 1, la base de datos igual
   rechaza el acceso cruzado entre organizaciones.

Ver `tests/integration/tenant-isolation.test.ts` para la prueba automatizada
de este comportamiento.

## RBAC

Roles: `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`, `BRANCH_MANAGER`,
`CASHIER`, más `PLATFORM_ADMIN` (flag `profiles.is_platform_admin`, no es
miembro de ninguna organización específica).

- Matriz de permisos: `src/lib/authz/permissions.ts`.
- Verificación: `src/lib/authz/session.ts` (`requireOrgRole`,
  `getOrgMembership`).
- La misma matriz de roles se refleja en las políticas RLS
  (`supabase/migrations/20260922100700_authz_functions.sql` y
  `..._rls_policies.sql`) — dos implementaciones independientes de la
  misma regla, no una que delega en la otra.

## Motor de lealtad (loyalty engine)

Ver `supabase/migrations/20260922100800_loyalty_functions.sql`.

- `loyalty_ledger` es append-only; nunca se hace `UPDATE` de saldos ahí.
- `customer_program_enrollments` es un caché de saldo, reconstruible al
  100% desde el ledger (`recompute_customer_balance()`).
- `record_purchase_transaction()`, `redeem_customer_reward()`,
  `refund_purchase_transaction()` y `adjust_customer_balance()` son
  funciones `SECURITY DEFINER` que:
  1. verifican rol/sucursal del llamador (`auth.uid()`),
  2. son idempotentes vía `(organization_id, idempotency_key)` único,
  3. escriben transacción + ledger + caché de saldo + evaluación de
     recompensas desbloqueadas en una sola transacción SQL (todo o nada).

## Event bus y webhooks

- Tabla `events`: outbox interno, poblado automáticamente por las funciones
  RPC del motor de lealtad y por `register_customer()`.
- `src/lib/webhooks/dispatch.ts`: la capa de aplicación llama
  `dispatchWebhooks(orgId, eventType, payload)` justo después de que una
  Server Action confirma que el evento ocurrió, y entrega un POST firmado
  (HMAC-SHA256) a cada webhook de la organización suscrito a ese tipo de
  evento. Ver `docs/development.md` para la lista de eventos disparados.

## Wallets

`src/lib/wallet/` — ver `docs/apple-wallet-setup.md` y
`docs/google-wallet-setup.md` para el detalle de cada proveedor. La
abstracción común es `WalletProvider` (`getSaveUrl`, `updatePass`,
`voidPass`); `getWalletProvider(platform)` elige la implementación real o
`MockWalletProvider` según haya credenciales configuradas.

## Billing

`src/lib/billing/` — ver `docs/billing.md`. `BillingProvider` abstrae
Checkout/Portal; Stripe es la fuente de verdad del estado de suscripción
vía webhook (`/api/webhooks/stripe`), nunca el cliente.

## Por qué Next.js App Router "full-stack" en vez de un backend separado

Server Actions + Route Handlers cubren todos los casos de este producto
(mutaciones autenticadas, webhooks entrantes, servicio de archivos como el
`.pkpass`) sin necesitar un servicio backend adicional. Postgres (vía
funciones RPC) es donde vive la lógica de negocio crítica de
consistencia (el ledger), no en la capa de aplicación — así que "backend"
en este proyecto está deliberadamente repartido entre Next.js (orquestación,
integraciones externas, autorización de UI) y Postgres (invariantes de
datos, atomicidad).
