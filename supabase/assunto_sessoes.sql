create table if not exists public.assunto_sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto_id text not null references public.assuntos(id) on delete cascade,
  sessao_id text not null references public.assembleias(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, assunto_id, sessao_id)
);

create index if not exists assunto_sessoes_user_id_idx
  on public.assunto_sessoes(user_id);

create index if not exists assunto_sessoes_assunto_id_idx
  on public.assunto_sessoes(assunto_id);

create index if not exists assunto_sessoes_sessao_id_idx
  on public.assunto_sessoes(sessao_id);

alter table public.assunto_sessoes enable row level security;

drop policy if exists "assunto_sessoes_select_own" on public.assunto_sessoes;
create policy "assunto_sessoes_select_own"
on public.assunto_sessoes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "assunto_sessoes_insert_own" on public.assunto_sessoes;
create policy "assunto_sessoes_insert_own"
on public.assunto_sessoes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.assuntos
    where assuntos.id = assunto_sessoes.assunto_id
      and assuntos.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.assembleias
    where assembleias.id = assunto_sessoes.sessao_id
      and assembleias.user_id = auth.uid()
  )
);

drop policy if exists "assunto_sessoes_update_own" on public.assunto_sessoes;
create policy "assunto_sessoes_update_own"
on public.assunto_sessoes
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.assuntos
    where assuntos.id = assunto_sessoes.assunto_id
      and assuntos.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.assembleias
    where assembleias.id = assunto_sessoes.sessao_id
      and assembleias.user_id = auth.uid()
  )
);

drop policy if exists "assunto_sessoes_delete_own" on public.assunto_sessoes;
create policy "assunto_sessoes_delete_own"
on public.assunto_sessoes
for delete
to authenticated
using (user_id = auth.uid());
