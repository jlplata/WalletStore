# DECISIONS.md

Registro de decisiones arquitectónicas significativas.

## 2026-09-22 — Stack base
Next.js 16 (App Router) + TypeScript + React 19 + Tailwind 4 + Supabase
(Postgres/Auth/Storage). Justificación: requerido por el brief, ecosistema
maduro, compatible con Vercel, RLS nativo de Postgres resuelve aislamiento
multi-tenant sin capa adicional.

## 2026-09-22 — TypeScript 5.x en vez de 7.x
npm muestra `typescript@7.0.2` como "latest" pero corresponde al nuevo
compilador nativo en preview (Corsa). Se fija TypeScript 5.x (el que
`create-next-app` instala por defecto) por estabilidad del ecosistema
(ESLint, tooling, tipos de Next.js) al día de hoy.

## 2026-09-22 — Ledger inmutable como fuente de verdad
Se descarta guardar únicamente un contador mutable de puntos/sellos.
`loyalty_ledger` es append-only; el saldo (`customer_program_state`) es un
caché reconstruible. Motivo: auditabilidad, prevención de fraude,
reconciliación, requisito explícito del brief (sección 9).

## 2026-09-22 — RLS + verificación server-side (defensa en profundidad)
No se confía en `organization_id` enviado por el cliente. Se deriva de la
sesión en el servidor y se verifica membership antes de cualquier mutación.
RLS en Postgres es la segunda barrera, no la única. Motivo: sección 29 del
brief, prevención de IDOR y fugas entre tenants.

## 2026-09-22 — Adaptadores desacoplados para integraciones externas
`WalletProvider`, `BillingProvider`, `EmailProvider` son interfaces con
implementaciones intercambiables. Permite mocks limpios en desarrollo sin
fingir integraciones reales, y agregar Mercado Pago / otros proveedores
después sin reescribir lógica de negocio.

## 2026-09-22 — Customer IDs no predecibles
Los clientes se identifican externamente (QR, URLs) mediante UUID v4 /
tokens aleatorios, nunca IDs incrementales. Motivo: sección 42 del brief
(prohibido) y prevención de enumeración.

## 2026-09-22 — Componentes UI escritos a mano en vez de `shadcn` CLI
El CLI de `shadcn` necesita descargar cada componente desde `ui.shadcn.com`,
dominio bloqueado por la política de red de este entorno (confirmado vía
`$HTTPS_PROXY/__agentproxy/status`, `connect_rejected`). Se escribieron los
componentes de `src/components/ui/` a mano siguiendo el mismo patrón
(Radix primitives + `class-variance-authority` + `cn()`), instalando los
paquetes `@radix-ui/react-*` directamente desde npm (sí permitido). El
resultado es funcionalmente equivalente; se puede migrar al CLI más
adelante si el entorno de despliegue tiene acceso a ese dominio.

## 2026-09-22 — Next.js 16: `proxy.ts` en vez de `middleware.ts`
Next.js 16 renombró la convención `middleware` a `proxy` (función exportada
`proxy` en `proxy.ts`). Se usa la convención nueva; ver
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

## 2026-09-22 — Monorepo simple (no monorepo multi-paquete)
Un solo proyecto Next.js full-stack en la raíz del repo, sin separar en
paquetes/workspaces todavía. Motivo: simplicidad > complejidad prematura;
se puede migrar a monorepo si se necesita un worker separado (p.ej. cron
de expiración de puntos) más adelante.
