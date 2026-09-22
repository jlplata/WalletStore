# Modelo de seguridad

## Principios

1. **Nunca confiar en el cliente.** Ningún `organization_id`, `role` o
   monto llega desde el navegador y se usa directamente para autorizar una
   escritura. Se deriva de la sesión (`auth.uid()`) en el servidor, y se
   vuelve a verificar en la base de datos vía RLS.
2. **Defensa en profundidad, no una sola capa.** `requireOrgRole()` en la
   app + RLS en Postgres son independientes; un bug en una no expone datos
   si la otra sigue funcionando (ver `docs/architecture.md#multi-tenancy`).
3. **El ledger es inmutable.** Nada en la app puede hacer `UPDATE` de un
   saldo directamente — todo pasa por funciones `SECURITY DEFINER`
   idempotentes.

## Autenticación

- Supabase Auth, cookies httpOnly, refrescadas en cada request por
  `proxy.ts` (ver `src/lib/supabase/proxy.ts`).
- El cliente final (customer) **no tiene cuenta** — se identifica por un
  `qr_token` UUID no adivinable, generado server-side, nunca por su ID
  incremental (no existen IDs incrementales expuestos en este esquema; todo
  es `uuid`).

## Autorización

- Matriz de permisos: `src/lib/authz/permissions.ts`.
- `PLATFORM_ADMIN` es un flag (`profiles.is_platform_admin`), protegido
  contra auto-escalación por un trigger (`protect_profile_admin_flag`, ver
  migración de RLS): un usuario no puede ponerse esa bandera a sí mismo vía
  `UPDATE profiles`.

## Secretos

- `SUPABASE_SERVICE_ROLE_KEY`, claves de Stripe, credenciales de Apple/Google
  y `RESEND_API_KEY` solo se leen en módulos marcados `import "server-only"`
  y solo se usan en Route Handlers/Server Actions — nunca en un Client
  Component ni se envían al navegador.
- El cliente `admin` (`src/lib/supabase/admin.ts`, usa la service role key)
  se reserva para: webhooks entrantes (Stripe), emisión de Wallet passes
  (contexto público sin sesión), lectura de `auth.users` para mostrar
  correos de staff, y auditoría. Cada uso está acompañado de su propio
  chequeo de autorización (`requireOrgRole`/`requirePlatformAdmin` antes de
  la llamada, o verificación de firma en el caso de webhooks).
- `.gitignore` excluye `.env*` (excepto `.env.example`), `*.pem`, `*.key`,
  `/certs/`, `/secrets/`.

## Validación

- Zod en el borde de cada Server Action pública (`src/lib/validations/`).
- Los formularios públicos (`/join/[programId]`, `/legal/eliminar-datos`)
  pasan por RPCs `SECURITY DEFINER` que validan sus propios parámetros
  (nunca confían en que el formulario ya validó todo).

## Idempotencia y condiciones de carrera

- `purchase_transactions` y `loyalty_ledger` tienen `unique(organization_id,
  idempotency_key)` — un reintento de red nunca duplica una compra.
- `redeem_customer_reward()` usa `SELECT ... FOR UPDATE` sobre la fila de
  `customer_rewards` antes de cambiar su estado, evitando un doble canje
  concurrente (dos cajeros canjeando la misma recompensa al mismo tiempo).
  Ver `tests/e2e/reward-redemption.spec.ts`.

## Antifraude (hooks, no motor de IA)

- `fraud_flags`: tabla lista para registrar señales (ajustes manuales
  repetidos, canjes anormalmente rápidos) — sin un motor de detección
  automática todavía (ver `TODO.md`, es explícitamente roadmap).
- Los ajustes manuales de saldo (`adjust_customer_balance`) exigen una
  razón no vacía y quedan en `audit_logs`.
- Un cliente puede marcarse `BLOCKED` (`customers.status`); el POS lo
  muestra visiblemente.

## Webhooks

- Salientes: firmados con HMAC-SHA256 (`X-WalletStore-Signature: sha256=...`),
  secreto generado con `crypto.randomBytes` y mostrado una sola vez al
  crearlos.
- Entrantes (Stripe): verificados con `stripe.webhooks.constructEvent` antes
  de procesar cualquier evento.

## Rate limiting

No implementado todavía a nivel de infraestructura (ver `TODO.md` — se
recomienda Upstash Redis o el rate limiting de Vercel antes de producción
para endpoints públicos como `/join/[programId]` y `submit_privacy_request`).

## Checklist previo a producción

Ver `PRODUCTION_CHECKLIST.md`.
