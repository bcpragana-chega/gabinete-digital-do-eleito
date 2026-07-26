alter table public.assembleias
  add column if not exists dados_confirmados_at timestamptz,
  add column if not exists preparacao_estado text not null default 'em_preparacao',
  add column if not exists pronta_em timestamptz,
  add column if not exists revisao_final_confirmada_at timestamptz;

alter table public.pontos
  add column if not exists posicao_politica text;

alter table public.assembleias
  drop constraint if exists assembleias_preparacao_estado_check;

alter table public.assembleias
  add constraint assembleias_preparacao_estado_check
  check (preparacao_estado in ('em_preparacao', 'pronta'));

create table if not exists public.assunto_pontos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assunto_id text not null references public.assuntos(id) on delete cascade,
  ponto_id text not null references public.pontos(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, assunto_id, ponto_id)
);

create index if not exists assunto_pontos_user_id_idx on public.assunto_pontos(user_id);
create index if not exists assunto_pontos_assunto_id_idx on public.assunto_pontos(assunto_id);
create index if not exists assunto_pontos_ponto_id_idx on public.assunto_pontos(ponto_id);

alter table public.assunto_pontos enable row level security;

drop policy if exists "assunto_pontos_select_own" on public.assunto_pontos;
create policy "assunto_pontos_select_own" on public.assunto_pontos
for select to authenticated using (user_id = auth.uid());

drop policy if exists "assunto_pontos_insert_own" on public.assunto_pontos;
create policy "assunto_pontos_insert_own" on public.assunto_pontos
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.assuntos where id = assunto_id and user_id = auth.uid())
  and exists (select 1 from public.pontos where id = ponto_id and user_id = auth.uid())
);

drop policy if exists "assunto_pontos_delete_own" on public.assunto_pontos;
create policy "assunto_pontos_delete_own" on public.assunto_pontos
for delete to authenticated using (user_id = auth.uid());

create or replace function public.reordenar_pontos_sessao(p_assembleia_id text, p_ponto_ids text[])
returns void language plpgsql security invoker as $$
declare item_id text; pos integer;
begin
  if (select count(*) from public.pontos where assembleia_id = p_assembleia_id and user_id = auth.uid()) <> cardinality(p_ponto_ids) then
    raise exception 'PONTO_ORDEM_INCOMPLETA';
  end if;
  pos := 1;
  foreach item_id in array p_ponto_ids loop
    update public.pontos set numero = -pos, updated_at = now()
    where id = item_id and assembleia_id = p_assembleia_id and user_id = auth.uid();
    if not found then raise exception 'PONTO_ORDEM_INVALIDA'; end if;
    pos := pos + 1;
  end loop;
  update public.pontos set numero = -numero
  where assembleia_id = p_assembleia_id and user_id = auth.uid() and numero < 0;
end;
$$;
