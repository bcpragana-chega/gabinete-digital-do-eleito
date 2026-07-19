create table if not exists public.acompanhamentos_politicos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto_id text not null references public.assuntos(id) on delete cascade,
  documento_criado_id text references public.documentos_criados(id) on delete set null,
  tipo text not null check (tipo in (
    'entrega', 'resposta', 'insistencia', 'regresso_sessao',
    'comunicacao_publica', 'resolucao', 'nota'
  )),
  data date not null,
  descricao text not null check (length(trim(descricao)) > 0),
  destinatario text,
  prazo date,
  proxima_acao_em date,
  estado text not null check (estado in (
    'a_preparar', 'a_aguardar', 'resposta_recebida', 'exige_acao',
    'resolvido', 'encerrado_sem_resolucao'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acompanhamentos_politicos_user_assunto_data_idx
  on public.acompanhamentos_politicos(user_id, assunto_id, data desc, created_at desc, id desc);
create index if not exists acompanhamentos_politicos_user_estado_prazo_idx
  on public.acompanhamentos_politicos(user_id, estado, prazo, proxima_acao_em);
create index if not exists acompanhamentos_politicos_documento_idx
  on public.acompanhamentos_politicos(documento_criado_id)
  where documento_criado_id is not null;

create or replace function public.validar_donos_acompanhamento_politico()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.user_id <> auth.uid() then
    raise exception 'ACOMPANHAMENTO_OWNER_INVALID';
  end if;
  if not exists (
    select 1 from public.assuntos
    where id = new.assunto_id and user_id = new.user_id
  ) then
    raise exception 'ACOMPANHAMENTO_ASSUNTO_INVALID';
  end if;
  if new.documento_criado_id is not null and not exists (
    select 1 from public.documentos_criados
    where id = new.documento_criado_id and user_id = new.user_id
  ) then
    raise exception 'ACOMPANHAMENTO_DOCUMENTO_INVALID';
  end if;
  return new;
end;
$$;

drop trigger if exists validar_donos_acompanhamento_politico
  on public.acompanhamentos_politicos;
create trigger validar_donos_acompanhamento_politico
before insert or update on public.acompanhamentos_politicos
for each row execute function public.validar_donos_acompanhamento_politico();

create or replace function public.atualizar_updated_at_acompanhamento_politico()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists atualizar_updated_at_acompanhamento_politico
  on public.acompanhamentos_politicos;
create trigger atualizar_updated_at_acompanhamento_politico
before update on public.acompanhamentos_politicos
for each row execute function public.atualizar_updated_at_acompanhamento_politico();

alter table public.acompanhamentos_politicos enable row level security;

drop policy if exists "acompanhamentos_select_owner" on public.acompanhamentos_politicos;
create policy "acompanhamentos_select_owner" on public.acompanhamentos_politicos
for select using (auth.uid() = user_id);

drop policy if exists "acompanhamentos_insert_owner" on public.acompanhamentos_politicos;
create policy "acompanhamentos_insert_owner" on public.acompanhamentos_politicos
for insert with check (auth.uid() = user_id);

drop policy if exists "acompanhamentos_update_owner" on public.acompanhamentos_politicos;
create policy "acompanhamentos_update_owner" on public.acompanhamentos_politicos
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "acompanhamentos_delete_owner" on public.acompanhamentos_politicos;
create policy "acompanhamentos_delete_owner" on public.acompanhamentos_politicos
for delete using (auth.uid() = user_id);
