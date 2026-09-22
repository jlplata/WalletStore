# IMPLEMENTATION PLAN — WalletStore (Plataforma SaaS de Lealtad Digital)

## 0. Resumen

WalletStore es una plataforma SaaS multiempresa (multi-tenant) que permite a
negocios físicos (cafeterías, restaurantes, barberías, gimnasios, etc.) crear
programas de lealtad digital basados en sellos o puntos, con tarjetas para
Apple Wallet y Google Wallet, sin requerir que el cliente final instale una
app.

Este documento es la fuente de verdad de la arquitectura y el plan de fases.
Se actualiza según avanza el proyecto. El estado vivo de avance está en
`PROGRESS.md`. Las decisiones técnicas relevantes están en `DECISIONS.md`.
El trabajo pendiente identificado pero no bloqueante está en `TODO.md`.

## 1. Stack confirmado (validado contra versiones estables actuales, 2026-09)

| Área | Elección | Versión objetivo |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Lenguaje | TypeScript | 5.x (TS7/Corsa aún prerelease para tooling amplio, no se usa) |
| UI | React | 19.x |
| Estilos | Tailwind CSS | 4.x |
| Componentes | shadcn/ui (Radix primitives) + lucide-react | latest |
| Validación | Zod | 4.x |
| Base de datos | PostgreSQL vía Supabase | - |
| Auth | Supabase Auth (`@supabase/ssr`) | latest |
| Storage | Supabase Storage | - |
| Billing | Stripe (`stripe`, `@stripe/stripe-js`) detrás de `BillingProvider` | latest |
| Email | Resend detrás de `EmailProvider` | latest |
| Wallet | Apple PassKit (`node-forge` para firma PKCS#7) + Google Wallet REST API (`google-auth-library`), detrás de `WalletProvider` | - |
| QR | `qrcode` | latest |
| Testing unit/integration | Vitest | latest |
| Testing E2E | Playwright | latest |
| CI | GitHub Actions | - |
| Hosting objetivo | Vercel (app) + Supabase (DB) | - |

Nota sobre TypeScript 7: en npm aparece como "7.0.2" pero corresponde al
nuevo compilador nativo (Corsa/"TypeScript Native Preview"), aún no es el
release recomendado para proyectos de producción con el ecosistema Next.js
actual. Se usa TypeScript 5.x estable (el que instala `create-next-app`).

## 2. Arquitectura

```
Browser (Next.js App Router, RSC + Client Components)
   │
   ├── Public marketing site (/)
   ├── Public join pages (/join/[slug])
   ├── Authenticated app (/app/...) — dashboard, POS, admin
   └── Platform admin (/admin)
   │
   ▼
Next.js Server (Route Handlers + Server Actions)
   │  - Autenticación vía Supabase Auth (cookies httpOnly)
   │  - Autorización server-side (roles + membership) en TODA mutación
   │  - Lógica de negocio: loyalty engine, wallet orchestration, billing
   │
   ▼
Supabase PostgreSQL
   │  - RLS activo en todas las tablas de negocio
   │  - service_role key SOLO en servidor (nunca en cliente)
   │  - Ledger inmutable como fuente de verdad de saldos
   │
   ▼
Integraciones externas (adaptadores desacoplados)
   - WalletProvider: AppleWalletProvider | GoogleWalletProvider | MockWalletProvider
   - BillingProvider: StripeBillingProvider | (futuro) MercadoPagoBillingProvider
   - EmailProvider: ResendEmailProvider | ConsoleEmailProvider (dev)
   - EventBus interno → webhook_deliveries (HMAC firmado) → futuro n8n
```

### Multi-tenancy

- Entidad raíz de negocio: `organizations`.
- Todo dato de negocio referencia `organization_id` (FK NOT NULL donde aplica).
- **RLS obligatorio** en todas las tablas expuestas vía Supabase (anon/authenticated).
- El `organization_id` NUNCA se confía si viene del cliente: en Server Actions/Route
  Handlers se deriva de la sesión autenticada + membership verificado en servidor
  (tabla `organization_members`), y las policies de RLS son la segunda barrera
  (defensa en profundidad).
- Tablas server-only sensibles (p.ej. `webhook_deliveries` con secretos derivados,
  `audit_logs` de escritura) se escriben con `service_role` desde Route Handlers,
  nunca desde el navegador.

### RBAC

Roles: `PLATFORM_ADMIN`, `ORGANIZATION_OWNER`, `ORGANIZATION_ADMIN`,
`BRANCH_MANAGER`, `CASHIER`. Se implementa como:
- Enum `member_role` en DB.
- Tabla `organization_members(user_id, organization_id, role, branch_ids[])`.
- Capa de permisos en `src/lib/authz/permissions.ts` (matriz acción→rol),
  extensible sin tocar cada endpoint.
- Verificación server-side en cada Server Action / Route Handler mediante
  `requireOrgRole(...)`.

### Loyalty Engine (núcleo crítico)

- `loyalty_ledger`: tabla append-only, fuente de verdad. Nunca se hace UPDATE
  de saldos ahí, solo INSERT.
- `customer_program_state`: saldo cacheado (stamps/points actuales,
  reconstruible 100% desde el ledger vía función SQL `recompute_balance`).
- Toda escritura de ledger + actualización de caché + evaluación de
  recompensas ocurre dentro de una transacción SQL (`BEGIN`/`COMMIT`) vía
  función `plpgsql` `record_purchase_transaction(...)` para garantizar
  atomicidad y evitar condiciones de carrera.
- Idempotencia: columna `idempotency_key` UNIQUE por organización en
  `purchase_transactions` y `loyalty_ledger`.

### Wallet abstraction

```ts
interface WalletProvider {
  createPass(input: CreatePassInput): Promise<WalletPassRef>
  updatePass(passId: string, input: UpdatePassInput): Promise<void>
  getSaveUrl(passId: string): Promise<string> // deep link / JWT save link
  voidPass(passId: string): Promise<void>
}
```
Implementaciones: `AppleWalletProvider` (PassKit real, requiere certificados),
`GoogleWalletProvider` (REST API real, requiere service account), y
`MockWalletProvider` (activo por defecto en dev si faltan credenciales,
claramente marcado como `provider: 'mock'` en DB y UI).

## 3. Fases (ver PROGRESS.md para estado vivo)

0. Discovery — este documento.
1. Foundation — Next.js, TS, Tailwind, shadcn, Supabase client, Auth, schema base, RLS, roles, layout.
2. Organizations — onboarding, branches, team, invitaciones.
3. Loyalty Engine — programs, customers, transactions, ledger, rewards, POS.
4. Customer Experience — join page pública, registro, QR, abstracción Wallet conectada.
5. Wallets — Apple real + Google real + mocks + orquestación de updates.
6. Analytics — dashboard, customers, segmentos.
7. Campaigns — campañas, triggers, event bus, webhooks salientes.
8. Billing — planes, feature flags, Stripe.
9. Platform Admin — super admin, métricas globales, auditoría.
10. Hardening — seguridad, performance, tests, CI/CD, docs finales.

## 4. Fuera de alcance del MVP (ver sección ROADMAP de PROGRESS.md)

WhatsApp/SMS reales, integraciones POS de terceros, NFC, white-label,
franquicias multi-país, IA de churn/recomendaciones, A/B testing. La
arquitectura no debe bloquear agregarlos después (event bus + adapters).

## 5. Deuda/bloqueos esperados

- Certificados Apple (Pass Type ID cert + WWDR) y credenciales de Google
  Wallet (service account) no existen aún → modo mock activo, documentado en
  `docs/apple-wallet-setup.md` y `docs/google-wallet-setup.md`.
- Claves de Stripe/Resend no existen aún → modo mock/console activo.
- Supabase: se documenta cómo crear el proyecto real; migraciones SQL se
  entregan listas para aplicar con `supabase db push` o el SQL editor.
