# Despliegue

Objetivo: Vercel (app) + Supabase (base de datos/auth/storage).

## 1. Supabase (producción)

1. Crea un proyecto en [supabase.com/dashboard](https://supabase.com/dashboard)
   (elige la región más cercana a tus usuarios, ej. `us-east-1` para México).
2. Aplica las migraciones en orden:
   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   ```
   O pega cada archivo de `supabase/migrations/` (en orden por nombre) en
   el SQL Editor del dashboard.
3. Verifica que el bucket `org-assets` se haya creado (migración
   `20260922101300_storage_buckets.sql`) — Storage → Buckets.
4. Copia `Project URL`, `anon public key` y `service_role key` desde
   Project Settings → API.

## 2. Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com/new).
2. Framework preset: Next.js (detectado automáticamente).
3. Variables de entorno (Project Settings → Environment Variables) — copia
   todas las de `.env.example` con sus valores reales:
   - `NEXT_PUBLIC_APP_URL` → tu dominio de producción (necesario para los
     enlaces de invitación, campañas, `webServiceURL` de Apple Wallet, etc.)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY`
   - Apple/Google Wallet, Stripe, Resend, `WEBHOOK_SIGNING_SECRET` — según
     qué integraciones vayas a activar (opcionales al inicio, ver sus docs
     dedicados).
4. Deploy.

## 3. Post-deploy

- Configura el webhook de Stripe apuntando a
  `https://tu-dominio.com/api/webhooks/stripe` (ver `docs/billing.md`).
- Si activas Apple Wallet, `APPLE_WEB_SERVICE_URL` debe apuntar al dominio
  de producción (no funciona con preview deployments de Vercel, porque
  Wallet necesita una URL estable).
- Marca tu propio usuario como `PLATFORM_ADMIN` para acceder a `/admin`:
  ```sql
  update public.profiles set is_platform_admin = true where id = '<tu-user-id>';
  ```
  (Encuentra tu `user-id` en Supabase Dashboard → Authentication → Users.)

## Estrategia de migraciones

- Cada archivo en `supabase/migrations/` es aditivo y numerado por
  timestamp — nunca edites uno ya aplicado en producción; crea uno nuevo.
- `supabase/migrations/*_seed_plans.sql` es segura de re-ejecutar
  (`on conflict do nothing`), a diferencia de un seed de datos demo (ver
  `scripts/seed-demo.ts`, que crea una organización de ejemplo y **no**
  debe correrse en un proyecto de producción con datos reales).

## Backups

Supabase hace backups automáticos diarios en los planes de pago (Point in
Time Recovery disponible desde el plan Pro). Para el plan gratuito,
considera exportar la base de datos periódicamente
(`supabase db dump`) mientras decides si mover el proyecto a un plan
pagado antes de tener usuarios reales.

## Observabilidad

- `/api/health` — healthcheck simple (app + conexión a base de datos),
  útil para monitoreo externo (UptimeRobot, Vercel's own monitoring, etc.).
- Sentry no está integrado todavía (ver `TODO.md`); los errores de servidor
  se registran con `console.error` (visibles en Vercel's function logs) y
  nunca exponen secretos en el mensaje.
