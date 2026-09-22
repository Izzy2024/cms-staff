create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cedula text not null,
  telefono text not null,
  email text,
  created_at timestamptz not null default now()
);

create table public.polizas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  aseguradora text not null,
  tipo_seguro text not null,
  detalle_bien text not null default '',
  numero_poliza text not null,
  vigencia_inicio date not null,
  vigencia_fin date not null,
  prima numeric not null default 0,
  observaciones text not null default '',
  created_at timestamptz not null default now()
);

create table public.documentos_poliza (
  id uuid primary key default gen_random_uuid(),
  poliza_id uuid not null references public.polizas(id) on delete cascade,
  nombre_archivo text not null,
  tipo_documento text not null,
  storage_path text not null,
  fecha_subida timestamptz not null default now()
);

create index polizas_cliente_id_idx on public.polizas(cliente_id);
create index documentos_poliza_poliza_id_idx on public.documentos_poliza(poliza_id);

alter table public.clientes enable row level security;
alter table public.polizas enable row level security;
alter table public.documentos_poliza enable row level security;

create policy "authenticated_all_clientes" on public.clientes
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_polizas" on public.polizas
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_documentos" on public.documentos_poliza
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false);

create policy "authenticated_all_storage_documentos" on storage.objects
  for all to authenticated
  using (bucket_id = 'documentos')
  with check (bucket_id = 'documentos');
;
