# WalletStore

Plataforma SaaS multiempresa de lealtad digital para negocios físicos
(cafeterías, restaurantes, barberías, gimnasios, etc.). Los clientes finales
se registran desde un QR y agregan su tarjeta a Apple Wallet o Google Wallet
sin instalar ninguna app.

Ver `IMPLEMENTATION_PLAN.md` para la arquitectura completa, `PROGRESS.md`
para el estado de cada fase, `DECISIONS.md` para decisiones técnicas y
`TODO.md` para trabajo pendiente/bloqueado por credenciales externas.

## Stack

Next.js 16 (App Router) · TypeScript · React 19 · Tailwind CSS 4 ·
Supabase (Postgres + Auth + Storage) · Stripe · Resend · Apple PassKit ·
Google Wallet API · Vitest · Playwright.

## Requisitos

- Node.js 22+
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito alcanza para desarrollo)

## Puesta en marcha local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en [supabase.com/dashboard](https://supabase.com/dashboard).

3. Copia `.env.example` a `.env.local` y llena las variables de
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` desde Project Settings → API de tu proyecto.

4. Aplica el esquema de base de datos. Con la [Supabase CLI](https://supabase.com/docs/guides/cli):

   ```bash
   supabase link --project-ref <tu-project-ref>
   supabase db push
   ```

   O, si prefieres no instalar la CLI, pega el contenido de cada archivo en
   `supabase/migrations/` (en orden, por nombre de archivo) en el SQL editor
   del dashboard de Supabase.

5. Corre el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

Sin las credenciales de Apple Wallet, Google Wallet, Stripe o Resend, la
aplicación funciona en modo de prueba (mock) para esas integraciones — ver
`docs/apple-wallet-setup.md`, `docs/google-wallet-setup.md` y `docs/billing.md`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir archivos |
| `npm run test` | Tests unitarios/integración (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright) |

## Documentación

- `docs/architecture.md` — arquitectura del sistema
- `docs/database.md` — modelo de datos y RLS
- `docs/security.md` — modelo de seguridad
- `docs/deployment.md` — despliegue a Vercel + Supabase
- `docs/apple-wallet-setup.md` — configurar Apple Wallet
- `docs/google-wallet-setup.md` — configurar Google Wallet
- `docs/billing.md` — configurar Stripe
- `docs/development.md` — guía para desarrolladores
- `docs/testing.md` — estrategia de pruebas
