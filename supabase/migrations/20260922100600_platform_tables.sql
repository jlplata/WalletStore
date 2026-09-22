-- WalletStore — 07. Platform: internal events, outbound webhooks, audit, fraud

-- Internal event bus / outbox. App code inserts here; a server-side dispatcher
-- (route handler or cron) fans out to webhook_deliveries for active webhooks
-- subscribed to that event type. See docs/architecture.md#event-bus.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  type text not null, -- e.g. customer.created, purchase.completed, reward.redeemed
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_org_idx on public.events (organization_id, created_at desc);
create index events_type_idx on public.events (type);

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  url text not null,
  secret text not null, -- used to HMAC-sign delivery payloads
  event_types text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_webhooks_updated_at
  before update on public.webhooks
  for each row execute function public.set_updated_at();

create index webhooks_org_idx on public.webhooks (organization_id);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhooks (id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status webhook_delivery_status not null default 'PENDING',
  attempts int not null default 0,
  last_attempted_at timestamptz,
  response_status int,
  created_at timestamptz not null default now()
);

create index webhook_deliveries_webhook_idx on public.webhook_deliveries (webhook_id);
create index webhook_deliveries_status_idx on public.webhook_deliveries (status);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  actor_user_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create table public.fraud_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  staff_user_id uuid references auth.users (id),
  type text not null, -- e.g. RAPID_REPEAT_REDEMPTION, MANUAL_ADJUSTMENT_LIMIT
  severity text not null default 'LOW' check (severity in ('LOW', 'MEDIUM', 'HIGH')),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index fraud_flags_org_idx on public.fraud_flags (organization_id, resolved);
