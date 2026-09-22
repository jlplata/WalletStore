-- WalletStore — 13. Seed billing plans (platform catalog, safe to run in prod)

insert into public.plans (code, name, description, price_monthly_cents, price_yearly_cents, sort_order)
values
  ('STARTER', 'Starter', 'Para un negocio con una sucursal que está empezando.', 39900, 399900, 1),
  ('PRO', 'Pro', 'Para negocios en crecimiento con varias sucursales.', 99900, 999900, 2),
  ('PREMIUM', 'Premium', 'Para cadenas con necesidades avanzadas de campañas y API.', 249900, 2499900, 3)
on conflict (code) do nothing;

insert into public.plan_features (plan_id, key, value)
select p.id, f.key, f.value
from public.plans p
cross join lateral (
  values
    ('branches_limit', case p.code when 'STARTER' then '1' when 'PRO' then '5' else '999' end::jsonb),
    ('staff_limit', case p.code when 'STARTER' then '3' when 'PRO' then '15' else '999' end::jsonb),
    ('customers_limit', case p.code when 'STARTER' then '500' when 'PRO' then '5000' else '999999' end::jsonb),
    ('campaigns_enabled', case p.code when 'STARTER' then 'false' else 'true' end::jsonb),
    ('advanced_segments', case p.code when 'PREMIUM' then 'true' else 'false' end::jsonb),
    ('exports', case p.code when 'STARTER' then 'false' else 'true' end::jsonb),
    ('api_access', case p.code when 'PREMIUM' then 'true' else 'false' end::jsonb),
    ('white_label', 'false'::jsonb)
) as f(key, value)
on conflict (plan_id, key) do nothing;
