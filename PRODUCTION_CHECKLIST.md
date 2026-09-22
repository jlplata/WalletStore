# PRODUCTION_CHECKLIST.md

Revisar antes de declarar el producto listo para clientes reales. Marcado
según el estado de este repositorio al final de la Fase 10; vuelve a
revisar esta lista cada vez que cambie algo relevante de seguridad o
infraestructura.

## Authentication
- [x] Supabase Auth con cookies httpOnly, sesión refrescada en cada request (`proxy.ts`).
- [x] El cliente final (customer) no requiere contraseña (identificado por `qr_token`, no un login clásico).
- [ ] Verificación de correo obligatoria para cuentas de staff en el proyecto Supabase de producción (activar "Confirm email" en Auth settings — no es un default de este repo, es config del proyecto).
- [ ] Política de contraseñas / MFA para `PLATFORM_ADMIN` (Supabase soporta MFA; no forzado todavía en la app).

## Authorization
- [x] Matriz de permisos server-side (`src/lib/authz/permissions.ts`) verificada en cada Server Action.
- [x] `PLATFORM_ADMIN` protegido contra auto-escalación (trigger `protect_profile_admin_flag`).
- [x] Rutas `/admin` guardadas por `requirePlatformAdmin()`.

## RLS
- [x] RLS activo en todas las tablas de negocio (ver `supabase/migrations/*_rls_policies.sql`).
- [x] Prueba automatizada de aislamiento entre tenants (`tests/integration/tenant-isolation.test.ts`) — **correrla contra el proyecto de producción recién creado, antes de dejarlo público**, apuntando temporalmente las variables de entorno a él.
- [ ] Ejecutar un pentest manual de IDOR sobre `/org/[orgSlug]/...` con dos cuentas de organizaciones distintas antes de lanzar.

## Secrets
- [x] `.env.local` y variantes excluidas de git (`.gitignore`).
- [x] `SUPABASE_SERVICE_ROLE_KEY` y demás secretos server-only, nunca en Client Components.
- [ ] Rotar cualquier clave que se haya compartido durante desarrollo/demos antes de producción.

## Rate limiting
- [ ] **No implementado.** Agregar antes de producción para endpoints públicos sin autenticación: `/join/[programId]` (registro), `register_customer` (vía RPC), `submit_privacy_request`, `/api/wallet/issue/...`. Recomendado: Vercel's rate limiting o Upstash Redis (ver `TODO.md`).

## Input validation
- [x] Zod en el borde de cada Server Action pública.
- [x] Las RPCs `SECURITY DEFINER` validan sus propios parámetros (no confían en que la app ya validó).

## CSRF
- [x] Server Actions de Next.js incluyen protección CSRF nativa (origin check) — no se requiere configuración adicional.

## XSS
- [x] React escapa por defecto; no se usa `dangerouslySetInnerHTML` salvo el HTML de campañas de correo (`src/app/org/[orgSlug]/campaigns/actions.ts`), que interpola texto del propio dueño del negocio (no de un usuario externo no confiable) — revisar si en el futuro se permite HTML libre en el mensaje.

## SQL injection
- [x] Todo acceso a datos vía Supabase client (parametrizado) o funciones RPC con parámetros tipados — no hay SQL concatenado manualmente en la app.

## IDOR
- [x] Cada consulta server-side filtra explícitamente por `organization_id` derivado de la sesión, más RLS como respaldo.
- [x] IDs de cliente final no son incrementales (`uuid`); el identificador público (`qr_token`) es no adivinable.

## Tenant isolation
- [x] Ver sección RLS arriba.

## Webhook validation
- [x] Entrantes (Stripe): firma verificada (`stripe.webhooks.constructEvent`) antes de procesar.
- [x] Salientes: firmados con HMAC-SHA256, secreto por webhook.

## Idempotency
- [x] `purchase_transactions` / `loyalty_ledger`: `unique(organization_id, idempotency_key)`.
- [x] Webhook de Stripe: `upsert` sobre `subscriptions` por `organization_id` (reprocesar el mismo evento es seguro).

## Concurrency
- [x] `redeem_customer_reward()` usa `SELECT ... FOR UPDATE` para evitar doble canje concurrente.

## Logging
- [x] Errores de servidor van a `console.error`/logs de la plataforma de hosting, sin secretos en el mensaje.
- [ ] Sentry (u otro APM) no integrado todavía — recomendado antes de escalar soporte a muchos negocios (ver `TODO.md`).

## Backups
- [ ] Confirmar plan de Supabase con backups automáticos/PITR antes de tener datos reales de clientes (ver `docs/deployment.md#backups`).

## Migration strategy
- [x] Migraciones aditivas, numeradas por timestamp, nunca editadas después de aplicarse (ver `docs/development.md`).

## Error handling
- [x] Errores de validación se muestran al usuario en español, sin exponer detalles internos de Postgres más allá del mensaje de negocio (`raise exception` con mensajes pensados para mostrarse).

## Privacy
- [x] Consentimiento de términos y marketing registrados por separado, con versión/fecha/origen (`customer_consents`).
- [x] Solicitud pública de eliminación de datos (`/legal/eliminar-datos`) funcional.
- [ ] Los textos de `/legal/privacidad` y `/legal/terminos` son plantillas explícitamente marcadas como revisables — deben pasar por un abogado antes de operar con clientes reales en México.
- [ ] Definir y automatizar el proceso real de cumplimiento de una solicitud de eliminación (`privacy_requests.status`) — hoy queda en `PENDING` esperando acción manual del negocio.

## Observability
- [x] `/api/health` (app + base de datos).
- [ ] Alertas activas sobre ese healthcheck (configurar en la plataforma de monitoreo elegida).

## Integraciones externas — estado real
- [ ] Apple Wallet: código listo, requiere certificados de una cuenta Apple Developer real (`docs/apple-wallet-setup.md`).
- [ ] Google Wallet: código listo, requiere cuenta de Google Wallet Business Console aprobada (`docs/google-wallet-setup.md`).
- [ ] Stripe: código listo, requiere cuenta y Price IDs configurados (`docs/billing.md`).
- [ ] Resend: código listo, requiere API key (sin ella, los correos solo se loguean en consola).

## Antes de marcar "production ready"

No se declara listo para producción mientras existan casillas sin marcar
arriba relacionadas con **rate limiting**, **backups** y **revisión legal
de los textos de privacidad/términos** — son las tres brechas conocidas más
importantes al cierre de este repositorio.
