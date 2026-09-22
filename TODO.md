# TODO.md

Trabajo identificado pero no bloqueante para el MVP, o dependiente de
credenciales/decisiones externas. Formato: prioridad, motivo, dependencia, fase.

## Bloqueados por credenciales externas

- **[ALTA] Certificados Apple Wallet reales** — código completo e
  implementado (`src/lib/wallet/apple/`: firma `.pkpass` con PKCS#7 vía
  `node-forge`, web service de PassKit, push real vía APNs con
  `node:http2`). Sin las credenciales, cae automáticamente a
  `MockWalletProvider`. Dependencia: usuario debe generar certificados (ver
  `docs/apple-wallet-setup.md`) y configurar `APPLE_CERTIFICATE_BASE64`,
  `APPLE_PRIVATE_KEY_BASE64`, `APPLE_WWDR_CERTIFICATE_BASE64`,
  `APPLE_PASS_TYPE_IDENTIFIER`, `APPLE_TEAM_IDENTIFIER`, `APPLE_WEB_SERVICE_URL`.
  Fase 5 (completada).
- **[ALTA] Service account de Google Wallet** — código completo e
  implementado (`src/lib/wallet/google/`: crea/actualiza loyaltyClass y
  loyaltyObject vía REST, firma el enlace "Save to Google Wallet" con JWT
  RS256). Sin las credenciales, cae automáticamente a `MockWalletProvider`.
  Dependencia: usuario debe crear cuenta de Google Wallet Business Console
  y aprobar la loyaltyClass (aprobación externa de Google, ver
  `docs/google-wallet-setup.md`) y configurar `GOOGLE_WALLET_ISSUER_ID`,
  `GOOGLE_SERVICE_ACCOUNT_JSON`. Fase 5 (completada).
- **[MEDIA] Claves Stripe reales** — código completo e implementado
  (`src/lib/billing/`: Checkout, Customer Portal, webhook con verificación
  de firma como fuente de verdad del estado de suscripción). Sin las
  claves, `BillingProvider` usa `MockBillingProvider` (activa el plan
  directamente en la base de datos, sin cargo real, con aviso explícito en
  la UI). Dependencia: usuario debe crear cuenta Stripe, productos/precios,
  y configurar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` + guardar los Price IDs en la tabla
  `plans` (ver `docs/billing.md`). Fase 8 (completada).
- **[MEDIA] Resend API key** — motivo: envío real de emails transaccionales y
  de campañas. Sin clave, `EmailProvider` usa `ConsoleEmailProvider` (loguea,
  no envía). Fase 7/2.
- **[BAJA] Proyecto Supabase real** — motivo: este repo no puede crear un
  proyecto Supabase por el usuario. Dependencia: usuario crea el proyecto y
  configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, luego aplica las migraciones en `supabase/migrations/`.
  Fase 1.

- **[MEDIA] Programación de campañas ("scheduled_at")** — la columna existe
  y la UI podría capturarla, pero no se expone en el formulario: no hay
  cron/worker en esta arquitectura Next.js-only para ejecutar envíos
  diferidos. Fase 7 solo implementa "enviar ahora" (funciona de verdad,
  sin simular). Dependencia: agregar un scheduler (Vercel Cron, un worker
  externo, o `pg_cron`/`pg_net` en Supabase) antes de exponer "programar".
- **[BAJA] Campañas por canal Wallet** — la brief pide "campañas sobre
  Wallet y email cuando sea técnicamente posible". Email está
  implementado; actualizar el campo `relevantText`/mensaje de un pase ya
  guardado sin re-emitirlo requiere más trabajo en los providers de Apple/
  Google. No se expuso esa opción en la UI para no crear un botón que no
  funcione. Fase 7/5.
- **[BAJA] `reward.unlocked` no se despacha como webhook saliente** — sí se
  registra en la tabla interna `events` (la función RPC lo inserta), pero
  el despachador de webhooks (`src/lib/webhooks/dispatch.ts`) solo se
  invoca explícitamente para los eventos que la capa de aplicación conoce
  con certeza (compra, canje, registro, Wallet agregado). Detectar qué
  recompensas se desbloquearon en una compra requeriría que la función RPC
  devuelva esa información. Fase 7.

## Roadmap post-MVP (no implementar ahora)

- WhatsApp Business API, SMS — Fase 7 (arquitectura preparada vía
  `EmailProvider`-like adapters, no implementado).
- Integraciones POS de terceros (Square, Shopify, WooCommerce) — futuro.
- Geocodificación automática de dirección de sucursal — Fase 2 (campo
  lat/lng manual por ahora).
- Referrals, tiers, memberships, prepaid credit, gift cards, NFC — futuro.
- White-label, reseller accounts, franquicias, multi-país — futuro.
- Campañas con IA, churn prediction, recomendaciones, A/B testing — futuro.
- Sentry real (solo se deja hook de logging estructurado preparado) — Fase 10.

- **[BAJA] Límites de plan no se aplican todavía** — `plan_features`
  (branches_limit, staff_limit, customers_limit, campaigns_enabled, etc.)
  existe y se muestra en `/billing`, pero ninguna acción del producto
  (crear sucursal, invitar, enviar campaña) verifica todavía el límite del
  plan activo antes de proceder. Fase 8/10.
- **[BAJA] Sin prorrateo/downgrade explícito en la UI** — cambiar de plan
  simplemente abre un nuevo Checkout; Stripe maneja el prorrateo al
  reemplazar la suscripción, pero no hay una pantalla de confirmación de
  cambio de plan en la app. Fase 8.

## Deuda técnica conocida

- Segmentos automáticos (Fase 6) se calculan por query en vivo inicialmente;
  si el volumen de clientes crece, evaluar materialized view.
- Rate limiting inicial es in-memory por instancia (Fase 1/10); para múltiples
  instancias en producción se recomienda Upstash Redis o equivalente (no
  agregado para no introducir dependencia externa sin necesidad confirmada).
- Push de Apple Wallet (`sendApplePassPush`) se envía de forma síncrona
  dentro de la petición que registra la compra/canje. Para volumen alto,
  mover a una cola (ver `webhook_deliveries` como precedente de patrón) en
  vez de bloquear la respuesta al cajero. Fase 5/10.
- `loyaltyClass` de Google Wallet se crea en estado `UNDER_REVIEW`; publicarla
  como `APPROVED` requiere solicitud de revisión a Google desde su consola
  (fuera del alcance de este repo). Fase 5.
- El link de descarga inicial del `.pkpass`
  (`/api/wallet/apple/passes/[serial].pkpass`) no requiere autenticación
  más allá de que el `serial` sea un UUID no adivinable; suficiente para
  MVP, pero podría reforzarse con un token de un solo uso si se detecta
  abuso. Fase 10 (hardening).
