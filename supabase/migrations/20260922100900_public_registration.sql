-- WalletStore — 10. Public customer-facing writes
--
-- Customers never get a Supabase Auth account (no password for the basic
-- flow, per product spec). Everything a customer does publicly — register,
-- opt out of marketing, request data deletion — goes through a narrow
-- SECURITY DEFINER RPC, callable with the anon key, that validates its own
-- inputs instead of relying on table-level RLS INSERT policies (which would
-- otherwise have to trust client-supplied organization_id/program_id).

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  request_type text not null check (request_type in ('DELETE_DATA', 'ACCESS_DATA', 'MARKETING_OPT_OUT')),
  contact_email citext,
  contact_phone text,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')),
  notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index privacy_requests_org_idx on public.privacy_requests (organization_id, status);

create or replace function public.register_customer(
  p_organization_id uuid,
  p_program_id uuid,
  p_first_name text,
  p_last_name text default null,
  p_phone text default null,
  p_email text default null,
  p_birthdate date default null,
  p_marketing_consent boolean default false,
  p_terms_version text default 'v1',
  p_source text default 'join_page'
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program public.programs;
  v_customer public.customers;
  v_code text;
begin
  select * into v_program from public.programs
  where id = p_program_id and organization_id = p_organization_id and is_active;
  if not found then
    raise exception 'program not found or inactive';
  end if;

  if p_first_name is null or length(trim(p_first_name)) = 0 then
    raise exception 'first name is required';
  end if;

  if p_phone is null and p_email is null then
    raise exception 'phone or email is required';
  end if;

  -- Re-use an existing customer for this org by phone (or email) instead of
  -- creating duplicates when someone re-joins the same business.
  if p_phone is not null then
    select * into v_customer from public.customers
    where organization_id = p_organization_id and phone = p_phone;
  end if;
  if not found and p_email is not null then
    select * into v_customer from public.customers
    where organization_id = p_organization_id and email = p_email;
  end if;

  if not found then
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    insert into public.customers (
      organization_id, public_code, first_name, last_name, phone, email, birthdate,
      marketing_consent, terms_accepted_at, terms_version, consent_source
    ) values (
      p_organization_id, v_code, trim(p_first_name), p_last_name, p_phone, p_email, p_birthdate,
      coalesce(p_marketing_consent, false), now(), p_terms_version, p_source
    )
    returning * into v_customer;

    insert into public.customer_consents (customer_id, organization_id, consent_type, granted, version, source)
    values (v_customer.id, p_organization_id, 'TERMS', true, p_terms_version, p_source);

    insert into public.customer_consents (customer_id, organization_id, consent_type, granted, version, source)
    values (v_customer.id, p_organization_id, 'MARKETING', coalesce(p_marketing_consent, false), p_terms_version, p_source);

    insert into public.events (organization_id, type, payload)
    values (p_organization_id, 'customer.created', jsonb_build_object('customer_id', v_customer.id));
  end if;

  insert into public.customer_program_enrollments (customer_id, program_id, organization_id)
  values (v_customer.id, p_program_id, p_organization_id)
  on conflict (customer_id, program_id) do nothing;

  return v_customer;
end;
$$;

create or replace function public.set_marketing_consent(p_qr_token uuid, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
begin
  select * into v_customer from public.customers where qr_token = p_qr_token;
  if not found then
    raise exception 'customer not found';
  end if;

  update public.customers set marketing_consent = p_granted where id = v_customer.id;

  insert into public.customer_consents (customer_id, organization_id, consent_type, granted, source)
  values (v_customer.id, v_customer.organization_id, 'MARKETING', p_granted, 'customer_self_service');
end;
$$;

create or replace function public.submit_privacy_request(
  p_organization_id uuid,
  p_request_type text,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_notes text default null
)
returns public.privacy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.privacy_requests;
begin
  if p_request_type not in ('DELETE_DATA', 'ACCESS_DATA', 'MARKETING_OPT_OUT') then
    raise exception 'invalid request type';
  end if;
  if p_contact_email is null and p_contact_phone is null then
    raise exception 'an email or phone is required to process the request';
  end if;

  insert into public.privacy_requests (organization_id, request_type, contact_email, contact_phone, notes)
  values (p_organization_id, p_request_type, p_contact_email, p_contact_phone, p_notes)
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.register_customer from public;
grant execute on function public.register_customer to anon, authenticated;

revoke all on function public.set_marketing_consent from public;
grant execute on function public.set_marketing_consent to anon, authenticated;

revoke all on function public.submit_privacy_request from public;
grant execute on function public.submit_privacy_request to anon, authenticated;
