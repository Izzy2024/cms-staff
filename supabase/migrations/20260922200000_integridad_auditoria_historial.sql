-- Integridad de datos en polizas y documentos
alter table public.polizas
  add constraint polizas_vigencia_valida check (vigencia_fin >= vigencia_inicio),
  add constraint polizas_prima_no_negativa check (prima >= 0),
  add constraint polizas_cuotas_validas check (numero_cuotas is null or numero_cuotas >= 1),
  add constraint polizas_tipo_seguro_valido check (tipo_seguro in ('Auto','Daños a Terceros','Incendio','Contenido','Vida','Accidentes Personales','Salud','Responsabilidad Civil','Fianza','Equipo Pesado','Asistencia Viajera','Otro')),
  add constraint polizas_frecuencia_valida check (frecuencia_pago is null or frecuencia_pago in ('Anual','Semestral','Trimestral','Mensual')),
  add constraint polizas_conducto_valido check (conducto_pago is null or conducto_pago in ('Voluntaria','TCR','ACH')),
  add constraint polizas_cobertura_valida check (cobertura_auto is null or cobertura_auto in ('Cobertura completa','Solo a terceros'));

alter table public.documentos_poliza
  add constraint documentos_tipo_valido check (tipo_documento in ('cedula','licencia','registroVehicular','proforma','cotizacion','poliza','endoso','kyc','otro'));

create index if not exists polizas_vigencia_fin_idx on public.polizas (vigencia_fin);

-- Historial de renovaciones: la nueva vigencia apunta a la anterior; cada vigencia se renueva a lo sumo una vez.
alter table public.polizas
  add column poliza_anterior_id uuid null references public.polizas (id) on delete set null;
create unique index polizas_poliza_anterior_unica on public.polizas (poliza_anterior_id) where poliza_anterior_id is not null;

-- updated_at automatico
alter table public.clientes add column updated_at timestamptz not null default now();
alter table public.polizas add column updated_at timestamptz not null default now();

create function public.tocar_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.tocar_updated_at();
create trigger polizas_updated_at before update on public.polizas
  for each row execute function public.tocar_updated_at();

-- Auditoria: quien cambio que y cuando. Solo la escribe el trigger; los agentes solo pueden leerla.
create table public.auditoria (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id uuid not null,
  accion text not null check (accion in ('INSERT','UPDATE','DELETE')),
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  usuario_id uuid,
  fecha timestamptz not null default now()
);
create index auditoria_registro_idx on public.auditoria (tabla, registro_id);

alter table public.auditoria enable row level security;
create policy "agente_lee_auditoria" on public.auditoria for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'agente');
revoke insert, update, delete, truncate on public.auditoria from anon, authenticated;

create function public.registrar_auditoria() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.auditoria (tabla, registro_id, accion, datos_anteriores, usuario_id)
    values (tg_table_name, old.id, tg_op, to_jsonb(old), auth.uid());
    return old;
  end if;
  insert into public.auditoria (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
  values (tg_table_name, new.id, tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new), auth.uid());
  return new;
end;
$$;
revoke execute on function public.registrar_auditoria() from public, anon, authenticated;

create trigger clientes_auditoria after insert or update or delete on public.clientes
  for each row execute function public.registrar_auditoria();
create trigger polizas_auditoria after insert or update or delete on public.polizas
  for each row execute function public.registrar_auditoria();
create trigger documentos_poliza_auditoria after insert or update or delete on public.documentos_poliza
  for each row execute function public.registrar_auditoria();
