# Modelo de datos

El esquema completo vive en `supabase/migrations/`, en orden de aplicación.
Este documento resume las decisiones, no repite cada columna (leer el SQL
directamente para eso — está comentado).

## Tablas principales

| Tabla | Propósito |
|---|---|
| `profiles` | 1:1 con `auth.users`. Incluye `is_platform_admin`. |
| `organizations` | Negocio. Público de lectura (branding en `/join`). |
| `organization_members` | Membresía + rol + `branch_ids` (vacío = todas). |
| `branches` | Sucursales. |
| `invitations` | Invitaciones al equipo, con token expirable. |
| `programs` / `program_rules` | Programa de lealtad y sus reglas (sellos o puntos). |
| `customers` | Cliente final. `qr_token` es el identificador público no adivinable (nunca el `id`). |
| `customer_consents` | Consentimiento de términos/marketing, versionado. |
| `customer_program_enrollments` | Saldo cacheado por cliente/programa. Reconstruible desde el ledger. |
| `rewards` | Recompensas configurables por programa. |
| `purchase_transactions` | Compras registradas en el POS. |
| `loyalty_ledger` | **Fuente de verdad.** Append-only. |
| `customer_rewards` | Instancias de recompensa (AVAILABLE/REDEEMED/EXPIRED/CANCELLED). |
| `wallet_passes` / `wallet_devices` | Tarjetas Wallet emitidas y dispositivos registrados (Apple). |
| `plans` / `plan_features` / `subscriptions` / `usage_records` | Billing. |
| `campaigns` / `campaign_audiences` / `campaign_deliveries` | Campañas. |
| `segments` | Definiciones de segmentos custom (los segmentos "de sistema" se calculan en vivo, ver abajo). |
| `events` | Outbox interno. |
| `webhooks` / `webhook_deliveries` | Webhooks salientes. |
| `audit_logs` | Auditoría de acciones sensibles. |
| `fraud_flags` | Señales antifraude (hook de arquitectura, sin motor de IA todavía). |
| `privacy_requests` | Solicitudes públicas de eliminación/acceso de datos. |

## Por qué no una tabla de saldo simple

`customer.points = 250` no es auditable ni corregible sin perder historia.
`loyalty_ledger` registra cada movimiento (`PURCHASE`, `STAMP_EARN`,
`POINTS_EARN`, `BONUS`, `ADJUSTMENT`, `REDEMPTION`, `EXPIRATION`, `REFUND`)
con su propio `idempotency_key`. El saldo en
`customer_program_enrollments` es un caché de rendimiento — si alguna vez
se sospecha de una inconsistencia, `recompute_customer_balance()` lo
recalcula desde cero sumando el ledger.

## Segmentos: calculados, no almacenados

`customer_segments(customer_id, program_id)` (función SQL) calcula en vivo
NEW/ACTIVE/REPEAT/VIP/AT_RISK/INACTIVE_30/INACTIVE_60/BIRTHDAY_MONTH/
NEAR_REWARD a partir de `customer_program_enrollments` + `rewards`. No hay
tabla de "membresía de segmento" que sincronizar. Si el volumen de clientes
crece lo suficiente para que esto sea lento, la migración natural es una
vista materializada refrescada periódicamente — no se implementó
prematuramente (ver `TODO.md`).

## RLS: patrón usado en todo el esquema

- Funciones helper `SECURITY DEFINER` (`is_org_member`, `has_org_role`,
  `can_access_branch`, `is_platform_admin`) evitan la recursión infinita
  que ocurriría si una política de `organization_members` tuviera que
  volver a consultar `organization_members` bajo RLS normal — estas
  funciones, al ser propiedad del rol que corrió las migraciones, están
  exentas de RLS al consultar directamente (patrón estándar de Supabase).
- Tablas cuyo único camino de escritura es una función `SECURITY DEFINER`
  (el ledger, `purchase_transactions`, `customer_rewards`,
  `customer_program_enrollments`, `events`, `audit_logs`, ...) **no tienen
  política de INSERT/UPDATE para `authenticated`/`anon`** — RLS deniega por
  defecto, y la función (dueña de la tabla) sigue pudiendo escribir. Esto
  hace que el ledger sea a prueba de manipulación incluso si un endpoint de
  la app tuviera un bug.
- `organizations`, `programs` (activos), `program_rules`, `rewards`
  (activos) y `plans`/`plan_features` son de lectura pública intencional —
  son los datos que la landing `/join/[programId]` y la página de precios
  necesitan mostrar a un visitante sin sesión. No contienen PII ni
  secretos.

## Regenerar los tipos de TypeScript

`src/lib/supabase/database.types.ts` está escrito a mano (sin acceso a un
proyecto Supabase real durante el desarrollo inicial de este repo). Una vez
tengas un proyecto real con las migraciones aplicadas, regenéralo y
reconcilia manualmente los enums/helpers que este archivo agrega encima del
output de la CLI:

```bash
npx supabase gen types typescript --project-id <tu-project-id> > src/lib/supabase/database.types.ts
```
