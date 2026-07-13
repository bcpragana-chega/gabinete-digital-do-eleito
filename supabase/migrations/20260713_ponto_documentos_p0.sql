create table if not exists public.ponto_documentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ponto_id text not null references public.pontos(id) on delete cascade,
  documento_id text not null references public.documentos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, ponto_id, documento_id)
);

create index if not exists ponto_documentos_ponto_id_idx
  on public.ponto_documentos(ponto_id);
create index if not exists ponto_documentos_documento_id_idx
  on public.ponto_documentos(documento_id);

alter table public.ponto_documentos enable row level security;

drop policy if exists "ponto_documentos_select_own" on public.ponto_documentos;
create policy "ponto_documentos_select_own"
on public.ponto_documentos for select to authenticated
using (user_id = auth.uid());

drop policy if exists "ponto_documentos_insert_own" on public.ponto_documentos;
create policy "ponto_documentos_insert_own"
on public.ponto_documentos for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (select 1 from public.pontos where id = ponto_id and user_id = auth.uid())
  and exists (select 1 from public.documentos where id = documento_id and user_id = auth.uid())
);

drop policy if exists "ponto_documentos_delete_own" on public.ponto_documentos;
create policy "ponto_documentos_delete_own"
on public.ponto_documentos for delete to authenticated
using (user_id = auth.uid());
