# PROGRESS.md

Última actualización: 2026-09-22

Leyenda: COMPLETED · IN PROGRESS · BLOCKED · NEXT

## FASE 0 — Discovery
- COMPLETED: Inspección de entorno, validación de versiones, IMPLEMENTATION_PLAN.md creado.

## FASE 1 — Foundation
- COMPLETED: Next.js 16 + TypeScript + Tailwind 4 + componentes UI (estilo
  shadcn, escritos a mano porque `ui.shadcn.com` está bloqueado por política
  de red del entorno). Clientes Supabase (browser/server/admin). `proxy.ts`
  (reemplazo de `middleware.ts` en Next 16) para refresco de sesión. Esquema
  SQL completo con RLS en `supabase/migrations/` (29 tablas, ledger
  inmutable, funciones RPC atómicas para compras/canjes/ajustes, helpers de
  autorización SECURITY DEFINER). Capa de autorización server-side
  (`src/lib/authz`). Auth (login/signup/callback/sign-out). Layout de app
  autenticada con sidebar por rol (`AppShell`) y ruteo `/org/[orgSlug]/...`.
  Landing pública. `npm run lint`, `npm run typecheck` y `npm run build`
  pasan limpio.

## FASE 2 — Organizations
- COMPLETED: Onboarding guiado en 6 pasos (negocio → marca → sucursal →
  programa → vista previa Wallet → QR), cada paso persistido en el servidor
  vía Server Actions con validación Zod y `requireOrgRole`. Subida real de
  logo a Supabase Storage (`org-assets`, bucket público de lectura, RLS por
  organización). Generación de QR real (`qrcode`) con URL de registro
  descargable. Página `/org/[orgSlug]/branches` (crear/editar/suspender).
  Página `/org/[orgSlug]/team` (invitar con token expirable + email real vía
  Resend o consola en dev, cambiar rol, remover acceso, revocar invitación).
  Flujo `/invite/[token]` para aceptar invitaciones. `/org/[orgSlug]/settings`
  para editar info general y marca después del onboarding. `EmailProvider`
  (Resend / consola) implementado. lint, typecheck y build pasan limpio.

## FASE 3 — Loyalty Engine
- COMPLETED: Gestión de programas (`/org/[orgSlug]/programs`, crear/activar/
  desactivar, QR descargable por programa vía `/api/qr`). Gestión de
  recompensas (`/org/[orgSlug]/rewards`). Clientes (`/org/[orgSlug]/customers`)
  con filtros por programa/segmento (usa `customers_in_segment`), búsqueda,
  enmascarado de contacto según rol, y detalle de cliente
  (`/customers/[id]`) con saldos por programa, Wallet, recompensas, ledger y
  consentimientos. Modo caja (`/org/[orgSlug]/pos`): escaneo QR con
  `BarcodeDetector` nativo + búsqueda manual, registrar compra
  (`record_purchase_transaction`), +1 sello manual (`adjust_customer_balance`),
  canjear recompensa (`redeem_customer_reward`), todo vía las funciones RPC
  atómicas de la Fase 1. lint, typecheck y build pasan limpio.

## FASE 4 — Customer Experience
- COMPLETED: Landing pública por programa (`/join/[programId]`) con
  branding, explicación de progreso y formulario de registro (sin
  contraseña) vía la RPC pública `register_customer`. Consentimientos
  (términos + marketing separado) registrados explícitamente. Página
  "Tu tarjeta está lista" (`/join/[programId]/lista`) con botones Add to
  Apple Wallet / Add to Google Wallet, detectando el dispositivo del
  cliente para priorizar el botón correcto sin ocultar el otro. Páginas
  legales (`/legal/privacidad`, `/legal/terminos`,
  `/legal/eliminar-datos`) marcadas explícitamente como plantillas
  revisables, con solicitud de eliminación de datos funcional.

## FASE 5 — Wallets
- COMPLETED: `WalletProvider` desacoplado (`src/lib/wallet/`) con
  `AppleWalletProvider`, `GoogleWalletProvider` y `MockWalletProvider`,
  seleccionado automáticamente según haya credenciales configuradas.
  Apple: firma real de `.pkpass` (PKCS#7 vía `node-forge`), web service
  completo de PassKit (registro/baja de dispositivo, última versión del
  pase, logging) y push real a APNs vía `node:http2` (sin dependencias
  nuevas). Google: creación/actualización real de `loyaltyClass`/
  `loyaltyObject` vía REST y enlace "Save to Google Wallet" firmado con
  JWT RS256. Mock: página de vista previa rotulada explícitamente "modo de
  prueba", nunca se presenta como integración real. Sincronización
  automática del Wallet tras compras/ajustes/canjes
  (`syncWalletPassesForCustomerProgram`). Documentado en
  `docs/apple-wallet-setup.md` y `docs/google-wallet-setup.md`. lint,
  typecheck y build pasan limpio.

## FASE 5 — Wallets
- NEXT (bloqueado parcialmente: requiere credenciales reales de Apple/Google para producción; mocks se implementan sin bloqueo)

## FASE 6 — Analytics
- COMPLETED: Dashboard real (`/org/[orgSlug]/dashboard`) con KPIs calculados
  en una sola función SQL (`org_dashboard_metrics`, con verificación de rol
  dentro de la función): clientes registrados/nuevos/activos/inactivos,
  transacciones, valor de compras, sellos/puntos otorgados, recompensas
  emitidas/canjeadas, tasa de canje. Selector de período (7/30/90 días).
  Gráfica de transacciones por día (`org_daily_transactions`) con un
  componente de barras propio, sin dependencia externa, siguiendo el
  skill de dataviz (un solo hue secuencial del token `--primary` de la
  app, tooltip real al pasar el cursor, etiquetas selectivas). Empty state
  cuando el negocio no tiene programas todavía. Filtros de clientes por
  segmento ya cubiertos en la Fase 3.

## FASE 7 — Campaigns
- COMPLETED: Webhooks salientes firmados con HMAC-SHA256
  (`src/lib/webhooks/dispatch.ts`), compatibles con n8n. Se despachan tras
  los eventos reales que la app puede detectar con certeza:
  `customer.created`, `customer.wallet_added`, `purchase.completed`,
  `loyalty.earned`, `reward.redeemed`, `campaign.sent`. Gestión de
  webhooks en Configuración (crear con secreto mostrado una sola vez,
  activar/desactivar, eliminar). Módulo de campañas
  (`/org/[orgSlug]/campaigns`): crear, elegir audiencia (segmento o todos),
  redactar, enviar por correo de inmediato vía `EmailProvider`, resultados
  reales (enviados/fallidos/sin correo — nunca aperturas o clics
  fabricados, porque el proveedor no los expone). "Programar para después"
  documentado como pendiente en `TODO.md` (requiere un scheduler que esta
  arquitectura Next.js-only no tiene todavía).

## FASE 8 — Billing
- COMPLETED: `BillingProvider` desacoplado (`src/lib/billing/`) con
  `StripeBillingProvider` (Checkout, Customer Portal, webhook con
  verificación de firma como única fuente de verdad del estado de
  suscripción — idempotente vía `upsert` por `organization_id`) y
  `MockBillingProvider` (activa el plan sin cargo real cuando no hay
  claves, con aviso explícito en la UI, vía `/billing/mock-checkout`).
  Página `/org/[orgSlug]/billing`: estado actual, comparación de planes
  (leídos de `plans`/`plan_features`, nunca hardcodeados), botón de
  checkout y de portal de administración. Documentado en
  `docs/billing.md`.

## FASE 9 — Platform Admin
- COMPLETED: `/admin` (protegido por `requirePlatformAdmin`, solo
  `profiles.is_platform_admin`). Dashboard con métricas globales reales
  (organizaciones totales/activas/en prueba, MRR estimado desde
  suscripciones activas, clientes finales, transacciones, Wallet passes
  totales vs. reales). Listado y detalle de organizaciones (dueño, plan,
  uso, sucursales/clientes/equipo, suspender/reactivar). Auditoría
  (`/admin/audit` + `src/lib/audit.ts`): registro real de acciones
  sensibles (cambio de rol, remoción de acceso, ajuste manual de saldo,
  suspensión/reactivación de organización) en `audit_logs`, nunca
  simulado.

## FASE 10 — Hardening
- NEXT

---

## ROADMAP POST-MVP (no implementado, arquitectura preparada)
WhatsApp Business, SMS, integraciones POS (Square/Shopify/WooCommerce),
referrals, tiers, memberships, prepaid credit, gift cards, NFC, white-label,
reseller/franquicias, multi-país, campañas con IA, churn prediction,
recomendaciones, A/B testing, atribución avanzada.
