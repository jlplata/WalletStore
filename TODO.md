# TODO.md

Trabajo identificado pero no bloqueante para el MVP, o dependiente de
credenciales/decisiones externas. Formato: prioridad, motivo, dependencia, fase.

## Bloqueados por credenciales externas

- **[ALTA] Certificados Apple Wallet reales** — motivo: firmar `.pkpass` con
  Pass Type ID cert + WWDR intermedio requiere cuenta Apple Developer.
  Dependencia: usuario debe generar certificados (ver `docs/apple-wallet-setup.md`)
  y configurar `APPLE_CERTIFICATE`, `APPLE_PRIVATE_KEY`, `APPLE_WWDR_CERTIFICATE`,
  `APPLE_PASS_TYPE_IDENTIFIER`, `APPLE_TEAM_IDENTIFIER`. Fase 5.
- **[ALTA] Service account de Google Wallet** — motivo: firmar JWT de "Save to
  Google Wallet" y llamar la API requiere Issuer ID + service account.
  Dependencia: usuario debe crear cuenta de Google Wallet Business Console
  (ver `docs/google-wallet-setup.md`) y configurar `GOOGLE_WALLET_ISSUER_ID`,
  `GOOGLE_SERVICE_ACCOUNT_JSON`. Fase 5.
- **[MEDIA] Claves Stripe reales** — motivo: Checkout/Portal/Webhooks en vivo
  requieren cuenta Stripe. Dependencia: `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. La
  integración está implementada contra la API real; sin claves, `BillingProvider`
  usa un adaptador mock explícito. Fase 8.
- **[MEDIA] Resend API key** — motivo: envío real de emails transaccionales y
  de campañas. Sin clave, `EmailProvider` usa `ConsoleEmailProvider` (loguea,
  no envía). Fase 7/2.
- **[BAJA] Proyecto Supabase real** — motivo: este repo no puede crear un
  proyecto Supabase por el usuario. Dependencia: usuario crea el proyecto y
  configura `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, luego aplica las migraciones en `supabase/migrations/`.
  Fase 1.

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

## Deuda técnica conocida

- Segmentos automáticos (Fase 6) se calculan por query en vivo inicialmente;
  si el volumen de clientes crece, evaluar materialized view.
- Rate limiting inicial es in-memory por instancia (Fase 1/10); para múltiples
  instancias en producción se recomienda Upstash Redis o equivalente (no
  agregado para no introducir dependencia externa sin necesidad confirmada).
