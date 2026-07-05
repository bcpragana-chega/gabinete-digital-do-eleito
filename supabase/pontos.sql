create table if not exists public.pontos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  assembleia_id text not null references public.assembleias(id) on delete cascade,

  numero integer not null,
  titulo text not null,
  descricao text,

  estado text not null default 'Por preparar',
  prioridade text not null default 'Média',

  objetivo_politico text,
  mensagem_principal text,
  riscos text,
  linha_intervencao text,
  notas_internas text,
  sentido_voto text not null default 'Por decidir',

  tempo_estimado integer,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pontos_numero_por_assembleia_unique unique (user_id, assembleia_id, numero)
);

create index if not exists pontos_user_id_idx on public.pontos(user_id);
create index if not exists pontos_assembleia_id_idx on public.pontos(assembleia_id);
create index if not exists pontos_assembleia_numero_idx on public.pontos(assembleia_id, numero);
create index if not exists pontos_updated_at_idx on public.pontos(updated_at desc);

alter table public.pontos enable row level security;

drop policy if exists "pontos_select_own" on public.pontos;
create policy "pontos_select_own"
on public.pontos
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "pontos_insert_own" on public.pontos;
create policy "pontos_insert_own"
on public.pontos
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pontos_update_own" on public.pontos;
create policy "pontos_update_own"
on public.pontos
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "pontos_delete_own" on public.pontos;
create policy "pontos_delete_own"
on public.pontos
for delete
to authenticated
using (user_id = auth.uid());

