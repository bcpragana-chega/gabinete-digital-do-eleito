create table if not exists public.assuntos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  descricao text,
  estado text not null,
  prioridade text not null,
  tags text[] not null default '{}',
  objetivo_politico text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assuntos_user_id_idx on public.assuntos(user_id);
create index if not exists assuntos_updated_at_idx on public.assuntos(updated_at desc);

alter table public.assuntos enable row level security;

drop policy if exists "assuntos_select_own" on public.assuntos;
create policy "assuntos_select_own"
on public.assuntos
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "assuntos_insert_own" on public.assuntos;
create policy "assuntos_insert_own"
on public.assuntos
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "assuntos_update_own" on public.assuntos;
create policy "assuntos_update_own"
on public.assuntos
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "assuntos_delete_own" on public.assuntos;
create policy "assuntos_delete_own"
on public.assuntos
for delete
to authenticated
using (user_id = auth.uid());

