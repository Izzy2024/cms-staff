-- Endurece RLS: restringe el acceso al rol 'agente' y limita el bucket 'documentos'.

drop policy if exists "authenticated_all_clientes" on public.clientes;
drop policy if exists "authenticated_all_polizas" on public.polizas;
drop policy if exists "authenticated_all_documentos" on public.documentos_poliza;
drop policy if exists "authenticated_all_storage_documentos" on storage.objects;

create policy "agente_all_clientes" on public.clientes
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agente')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agente');

create policy "agente_all_polizas" on public.polizas
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agente')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agente');

create policy "agente_all_documentos_poliza" on public.documentos_poliza
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agente')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agente');

create policy "agente_all_storage_documentos" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'documentos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'agente')
  with check (bucket_id = 'documentos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'agente');

update storage.buckets
  set file_size_limit = 10485760,
      allowed_mime_types = '{application/pdf,image/jpeg,image/png}'
  where id = 'documentos';;
