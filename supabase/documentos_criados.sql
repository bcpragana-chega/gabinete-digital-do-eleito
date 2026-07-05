create table if not exists public.documentos_criados (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'outro_documento',
  estado text not null default 'rascunho',
  conteudo text,
  conteudo_json jsonb,
  formato_conteudo text not null default 'plain_text',
  resumo text,
  notas text,
  tags text[] not null default '{}',
  origem text not null default 'manual',
  origem_prompt text,
  ia_modelo text,
  ia_metadata jsonb,
  assunto_id text references public.assuntos(id) on delete set null,
  assembleia_id text references public.assembleias(id) on delete set null,
  ponto_id text references public.pontos(id) on delete set null,
  documento_final_id text references public.documentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  finalizado_em timestamptz,
  apresentado_em timestamptz,
  constraint documentos_criados_tipo_check check (
    tipo in ('mocao', 'recomendacao', 'requerimento', 'declaracao_voto', 'outro_documento')
  ),
  constraint documentos_criados_estado_check check (
    estado in ('rascunho', 'em_revisao', 'final', 'pronto', 'apresentado', 'arquivado')
  ),
  constraint documentos_criados_origem_check check (
    origem in ('manual', 'ia', 'importado', 'modelo')
  ),
  constraint documentos_criados_formato_check check (
    formato_conteudo in ('plain_text', 'markdown', 'html', 'prosemirror_json', 'blocks_json')
  )
);

create index if not exists documentos_criados_user_id_idx on public.documentos_criados(user_id);
create index if not exists documentos_criados_user_updated_at_idx
  on public.documentos_criados(user_id, updated_at desc);
create index if not exists documentos_criados_user_estado_idx
  on public.documentos_criados(user_id, estado);
create index if not exists documentos_criados_user_tipo_idx
  on public.documentos_criados(user_id, tipo);
create index if not exists documentos_criados_assunto_id_idx
  on public.documentos_criados(assunto_id);
create index if not exists documentos_criados_assembleia_id_idx
  on public.documentos_criados(assembleia_id);
create index if not exists documentos_criados_ponto_id_idx
  on public.documentos_criados(ponto_id);
create index if not exists documentos_criados_documento_final_id_idx
  on public.documentos_criados(documento_final_id);
create index if not exists documentos_criados_tags_idx
  on public.documentos_criados using gin(tags);
create index if not exists documentos_criados_titulo_search_idx
  on public.documentos_criados using gin(to_tsvector('portuguese', coalesce(titulo, '')));
create index if not exists documentos_criados_conteudo_search_idx
  on public.documentos_criados using gin(to_tsvector('portuguese', coalesce(conteudo, '')));

create or replace function public.set_documentos_criados_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documentos_criados_set_updated_at on public.documentos_criados;
create trigger documentos_criados_set_updated_at
before update on public.documentos_criados
for each row
execute function public.set_documentos_criados_updated_at();

alter table public.documentos_criados enable row level security;

drop policy if exists "documentos_criados_select_own" on public.documentos_criados;
create policy "documentos_criados_select_own"
on public.documentos_criados
for select
using (auth.uid() = user_id);

drop policy if exists "documentos_criados_insert_own" on public.documentos_criados;
create policy "documentos_criados_insert_own"
on public.documentos_criados
for insert
with check (auth.uid() = user_id);

drop policy if exists "documentos_criados_update_own" on public.documentos_criados;
create policy "documentos_criados_update_own"
on public.documentos_criados
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "documentos_criados_delete_own" on public.documentos_criados;
create policy "documentos_criados_delete_own"
on public.documentos_criados
for delete
using (auth.uid() = user_id);
