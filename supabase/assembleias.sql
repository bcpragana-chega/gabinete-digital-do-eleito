create table if not exists public.assembleias (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'Sessão',
  orgao text,
  data text not null,
  local text,
  estado text not null,
  notas text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assembleias_user_id_idx on public.assembleias(user_id);
create index if not exists assembleias_data_idx on public.assembleias(data desc);
create index if not exists assembleias_updated_at_idx on public.assembleias(updated_at desc);

alter table public.assembleias enable row level security;

drop policy if exists "assembleias_select_own" on public.assembleias;
create policy "assembleias_select_own"
on public.assembleias
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "assembleias_insert_own" on public.assembleias;
create policy "assembleias_insert_own"
on public.assembleias
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "assembleias_update_own" on public.assembleias;
create policy "assembleias_update_own"
on public.assembleias
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "assembleias_delete_own" on public.assembleias;
create policy "assembleias_delete_own"
on public.assembleias
for delete
to authenticated
using (user_id = auth.uid());
