create table if not exists public.documentos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text not null default 'Outro',
  estado text not null default 'por_tratar',
  origem text not null default 'manual',
  origem_tipo text,
  origem_ref text,
  storage_bucket text,
  storage_path text,
  ficheiro_nome text,
  ficheiro_tipo text,
  ficheiro_tamanho bigint,
  paginas integer,
  checksum text,
  texto_extraido text,
  resumo text,
  notas text,
  tags text[] not null default '{}',
  assunto_origem_id text references public.assuntos(id) on delete set null,
  assembleia_origem_id text references public.assembleias(id) on delete set null,
  ponto_origem_id text references public.pontos(id) on delete set null,
  data_documento date,
  recebido_em timestamptz,
  analisado_em timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_estado_check check (
    estado in ('por_tratar', 'em_analise', 'analisado', 'importante', 'arquivado')
  ),
  constraint documentos_origem_check check (
    origem in ('manual', 'upload', 'ia', 'importado', 'documento_criado', 'email', 'link')
  )
);

create index if not exists documentos_user_id_idx on public.documentos(user_id);
create index if not exists documentos_user_updated_at_idx on public.documentos(user_id, updated_at desc);
create index if not exists documentos_user_estado_idx on public.documentos(user_id, estado);
create index if not exists documentos_user_tipo_idx on public.documentos(user_id, tipo);
create index if not exists documentos_assunto_origem_id_idx on public.documentos(assunto_origem_id);
create index if not exists documentos_assembleia_origem_id_idx on public.documentos(assembleia_origem_id);
create index if not exists documentos_ponto_origem_id_idx on public.documentos(ponto_origem_id);
create index if not exists documentos_tags_idx on public.documentos using gin(tags);
create index if not exists documentos_titulo_search_idx
  on public.documentos using gin(to_tsvector('portuguese', coalesce(titulo, '')));
create index if not exists documentos_resumo_search_idx
  on public.documentos using gin(to_tsvector('portuguese', coalesce(resumo, '')));

create or replace function public.set_documentos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documentos_set_updated_at on public.documentos;
create trigger documentos_set_updated_at
before update on public.documentos
for each row
execute function public.set_documentos_updated_at();

alter table public.documentos enable row level security;

drop policy if exists "documentos_select_own" on public.documentos;
create policy "documentos_select_own"
on public.documentos
for select
using (auth.uid() = user_id);

drop policy if exists "documentos_insert_own" on public.documentos;
create policy "documentos_insert_own"
on public.documentos
for insert
with check (auth.uid() = user_id);

drop policy if exists "documentos_update_own" on public.documentos;
create policy "documentos_update_own"
on public.documentos
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "documentos_delete_own" on public.documentos;
create policy "documentos_delete_own"
on public.documentos
for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 52428800, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documentos_storage_select_own" on storage.objects;
create policy "documentos_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = 'documentos'
  and auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists "documentos_storage_insert_own" on storage.objects;
create policy "documentos_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = 'documentos'
  and auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists "documentos_storage_update_own" on storage.objects;
create policy "documentos_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = 'documentos'
  and auth.uid()::text = (storage.foldername(name))[2]
)
with check (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = 'documentos'
  and auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists "documentos_storage_delete_own" on storage.objects;
create policy "documentos_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documentos'
  and (storage.foldername(name))[1] = 'documentos'
  and auth.uid()::text = (storage.foldername(name))[2]
);
