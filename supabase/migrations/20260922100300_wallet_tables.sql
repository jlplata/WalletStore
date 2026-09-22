-- WalletStore — 04. Wallet tables (Apple / Google, provider-agnostic)

create table public.wallet_passes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  platform wallet_platform not null,
  provider_mode wallet_provider_mode not null default 'MOCK',
  serial_number text not null unique,
  auth_token text not null, -- Apple web service authentication token (opaque, server-generated)
  pass_type_identifier text,
  status wallet_pass_status not null default 'ACTIVE',
  last_pushed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, program_id, platform)
);

create trigger trg_wallet_passes_updated_at
  before update on public.wallet_passes
  for each row execute function public.set_updated_at();

create index wallet_passes_org_idx on public.wallet_passes (organization_id);
create index wallet_passes_customer_idx on public.wallet_passes (customer_id);

-- Apple PassKit device registration (device <-> pass, for push updates).
create table public.wallet_devices (
  id uuid primary key default gen_random_uuid(),
  wallet_pass_id uuid not null references public.wallet_passes (id) on delete cascade,
  device_library_identifier text not null,
  push_token text not null,
  created_at timestamptz not null default now(),
  unique (wallet_pass_id, device_library_identifier)
);

create index wallet_devices_pass_idx on public.wallet_devices (wallet_pass_id);
