# Configurar Stripe (Billing)

WalletStore incluye una integración real con Stripe (`src/lib/billing/`):
Checkout, Customer Portal y webhooks con verificación de firma. Mientras no
configures las claves de abajo, `BillingProvider` usa `MockBillingProvider`:
"comprar" un plan activa la suscripción directamente en la base de datos sin
ningún cargo real, y la UI lo indica explícitamente ("Modo de prueba").

## 1. Crear cuenta y productos en Stripe

1. Crea una cuenta en [dashboard.stripe.com](https://dashboard.stripe.com).
2. En modo de prueba (o producción, cuando estés listo), crea un producto y
   un precio recurrente mensual por cada plan (`STARTER`, `PRO`, `PREMIUM`
   — ver `supabase/migrations/20260922101200_seed_plans.sql`).
3. Copia el **Price ID** (`price_...`) de cada uno.

## 2. Guardar los Price IDs en la base de datos

Los Price IDs no son variables de entorno (son datos, no secretos) — se
guardan en la tabla `plans`:

```sql
update public.plans set stripe_price_id_monthly = 'price_XXXXXXXX' where code = 'STARTER';
update public.plans set stripe_price_id_monthly = 'price_YYYYYYYY' where code = 'PRO';
update public.plans set stripe_price_id_monthly = 'price_ZZZZZZZZ' where code = 'PREMIUM';
```

Sin esto, `StripeBillingProvider.createCheckoutSession` devuelve un error
explícito ("este plan no tiene un precio de Stripe configurado") en vez de
fallar en silencio.

## 3. Variables de entorno

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

`STRIPE_WEBHOOK_SECRET` se obtiene al crear el endpoint de webhook (paso
siguiente); mientras no exista, `/api/webhooks/stripe` responde `503`.

## 4. Configurar el webhook

1. En Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. URL: `https://tu-dominio.com/api/webhooks/stripe`.
3. Eventos a escuchar: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

Para probar en local, usa la [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 5. Cómo funciona en el código

- `src/lib/billing/stripe-provider.ts` — crea sesiones de Checkout
  (suscripción) y del Customer Portal.
- `src/app/api/webhooks/stripe/route.ts` — verifica la firma con
  `stripe.webhooks.constructEvent`, y es la **única** fuente de verdad para
  activar/actualizar/cancelar una suscripción (nunca se confía en el
  navegador). Hace `upsert` sobre `subscriptions` por `organization_id`, así
  que reprocesar el mismo evento (Stripe reintenta entregas) es seguro.
- `MockBillingProvider` + `/billing/mock-checkout` — simulan el flujo
  completo sin Stripe, para poder demostrar el producto de inmediato.

## 6. Probar

1. Sin configurar nada: ve a `/org/[tu-negocio]/billing`, elige un plan →
   confirmas en la pantalla de "modo de prueba" → el plan se activa.
2. Con Stripe configurado (claves de prueba + Price IDs + webhook local via
   Stripe CLI): el mismo botón te lleva a Stripe Checkout real (en modo
   test, usa la tarjeta `4242 4242 4242 4242`).
3. "Administrar facturación" abre el Customer Portal de Stripe.

## Limitación conocida

No hay lógica de prorrateo/downgrade inmediato en la UI — cambiar de plan
crea una nueva sesión de Checkout (Stripe se encarga del prorrateo al
reemplazar la suscripción). Ver `TODO.md` para mejoras futuras (uso medido,
límites del plan aplicados en la app).
