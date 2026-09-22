-- WalletStore — 01. Extensions & Enums
-- Multi-tenant loyalty SaaS. See docs/database.md and docs/architecture.md.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive email/slug

-- Roles (RBAC). PLATFORM_ADMIN is not stored here as a membership row but as
-- a flag on profiles (a platform admin is not "member" of any one org).
create type member_role as enum (
  'ORGANIZATION_OWNER',
  'ORGANIZATION_ADMIN',
  'BRANCH_MANAGER',
  'CASHIER'
);

create type organization_status as enum ('TRIAL', 'ACTIVE', 'SUSPENDED');

create type program_type as enum ('STAMPS', 'POINTS');

create type ledger_entry_type as enum (
  'PURCHASE',
  'STAMP_EARN',
  'POINTS_EARN',
  'BONUS',
  'ADJUSTMENT',
  'REDEMPTION',
  'EXPIRATION',
  'REFUND'
);

create type transaction_status as enum ('COMPLETED', 'VOIDED', 'REFUNDED');

create type reward_type as enum (
  'FREE_ITEM',
  'DISCOUNT_FIXED',
  'DISCOUNT_PERCENTAGE',
  'CUSTOM'
);

create type reward_instance_status as enum (
  'AVAILABLE',
  'REDEEMED',
  'EXPIRED',
  'CANCELLED'
);

create type wallet_platform as enum ('APPLE', 'GOOGLE');
create type wallet_provider_mode as enum ('LIVE', 'MOCK');
create type wallet_pass_status as enum ('ACTIVE', 'VOIDED');

create type campaign_type as enum (
  'PROMOTION', 'BIRTHDAY', 'WIN_BACK', 'BONUS_POINTS', 'DOUBLE_STAMPS', 'CUSTOM'
);
create type campaign_status as enum (
  'DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'
);
create type campaign_channel as enum ('EMAIL', 'WALLET');
create type delivery_status as enum ('QUEUED', 'SENT', 'FAILED', 'DELIVERED');

create type subscription_status as enum (
  'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE'
);

create type invitation_status as enum ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

create type consent_type as enum ('TERMS', 'MARKETING');

create type webhook_delivery_status as enum ('PENDING', 'SUCCESS', 'FAILED');

-- Generic updated_at trigger, reused by every table below.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
