-- WalletStore — 14. Storage buckets
--
-- `org-assets` holds business-facing images (logos, banners, program
-- artwork) that must be publicly readable (they appear on the public
-- /join/[slug] page and on wallet passes), but only writable by staff of
-- the owning organization. Objects are stored under `${organizationId}/...`
-- so the RLS policy can check the path prefix against membership.

insert into storage.buckets (id, name, public)
values ('org-assets', 'org-assets', true)
on conflict (id) do nothing;

create policy "org_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'org-assets');

create policy "org_assets_staff_write"
  on storage.objects for insert
  with check (
    bucket_id = 'org-assets'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]
    )
  );

create policy "org_assets_staff_update"
  on storage.objects for update
  using (
    bucket_id = 'org-assets'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]
    )
  );

create policy "org_assets_staff_delete"
  on storage.objects for delete
  using (
    bucket_id = 'org-assets'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN']::member_role[]
    )
  );
