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
- NEXT

## FASE 5 — Wallets
- NEXT (bloqueado parcialmente: requiere credenciales reales de Apple/Google para producción; mocks se implementan sin bloqueo)

## FASE 6 — Analytics
- NEXT

## FASE 7 — Campaigns
- NEXT

## FASE 8 — Billing
- NEXT (bloqueado parcialmente: requiere claves reales de Stripe para pagos en vivo; Checkout/webhooks se implementan contra API real, probados con claves de test cuando estén disponibles)

## FASE 9 — Platform Admin
- NEXT

## FASE 10 — Hardening
- NEXT

---

## ROADMAP POST-MVP (no implementado, arquitectura preparada)
WhatsApp Business, SMS, integraciones POS (Square/Shopify/WooCommerce),
referrals, tiers, memberships, prepaid credit, gift cards, NFC, white-label,
reseller/franquicias, multi-país, campañas con IA, churn prediction,
recomendaciones, A/B testing, atribución avanzada.
