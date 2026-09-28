-- Bucket public pour les ressources de marque (logo…) référencées depuis des
-- contextes qui ne peuvent pas charger un fichier privé signé — notamment les
-- emails transactionnels (send-invitation), lus par un client mail externe
-- sans session Supabase.
insert into storage.buckets (id, name, public)
values ('assets-publics', 'assets-publics', true)
on conflict (id) do nothing;

drop policy if exists assets_publics_select on storage.objects;
create policy assets_publics_select on storage.objects
  for select
  using (bucket_id = 'assets-publics');

drop policy if exists assets_publics_write_super_admin on storage.objects;
create policy assets_publics_write_super_admin on storage.objects
  for all
  using (bucket_id = 'assets-publics' and is_super_admin())
  with check (bucket_id = 'assets-publics' and is_super_admin());
