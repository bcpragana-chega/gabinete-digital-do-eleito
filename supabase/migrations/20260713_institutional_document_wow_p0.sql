alter table public.documentos
  add column if not exists estado_analise text not null default 'nao_analisado',
  add column if not exists analise_institucional jsonb,
  add column if not exists analise_institucional_em timestamptz,
  add column if not exists analise_institucional_versao integer;

alter table public.documentos
  drop constraint if exists documentos_estado_analise_check;

alter table public.documentos
  add constraint documentos_estado_analise_check check (
    estado_analise in (
      'nao_analisado', 'a_analisar', 'analisado',
      'necessita_confirmacao', 'confirmado', 'erro'
    )
  );

create index if not exists documentos_user_estado_analise_idx
  on public.documentos(user_id, estado_analise);

create or replace function public.confirmar_analise_documento_sessao(
  p_documento_id text,
  p_analise jsonb,
  p_modo text default 'criar',
  p_sessao_existente_id text default null
) returns jsonb language plpgsql security invoker as $$
declare
  v_user uuid := auth.uid();
  v_sessao_id text;
  v_duplicado_id text;
  v_ponto jsonb;
  v_numero integer := 0;
  v_criados integer := 0;
  v_titulo text;
  v_data text;
  v_hora text;
  v_orgao text;
  v_entidade text;
  v_tipo text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.documentos where id = p_documento_id and user_id = v_user) then
    raise exception 'DOCUMENTO_NOT_FOUND';
  end if;

  v_data := nullif(trim(p_analise #>> '{sessao,data}'), '');
  v_hora := nullif(trim(p_analise #>> '{sessao,hora}'), '');
  v_orgao := nullif(trim(p_analise #>> '{sessao,orgao}'), '');
  v_entidade := nullif(trim(p_analise #>> '{sessao,entidade}'), '');
  v_tipo := coalesce(nullif(trim(p_analise #>> '{sessao,tipo}'), ''), 'desconhecida');
  if v_data is null or v_hora is null or v_orgao is null then raise exception 'DADOS_OBRIGATORIOS_EM_FALTA'; end if;

  select id into v_duplicado_id from public.assembleias
  where user_id = v_user and archived_at is null
    and split_part(data, 'T', 1) = v_data
    and lower(coalesce(orgao, '')) = lower(v_orgao)
    and lower(coalesce(notas, '')) like '%' || lower(coalesce(v_entidade, '')) || '%'
    and lower(coalesce(tipo, '')) = lower(v_tipo)
  limit 1;

  if v_duplicado_id is not null and p_modo = 'criar' and p_sessao_existente_id is null then
    return jsonb_build_object('status', 'duplicado', 'sessaoId', v_duplicado_id);
  end if;

  if p_modo = 'atualizar' then
    v_sessao_id := coalesce(p_sessao_existente_id, v_duplicado_id);
    if v_sessao_id is null then raise exception 'SESSAO_EXISTENTE_NAO_ENCONTRADA'; end if;
    update public.assembleias set
      titulo = coalesce(nullif(trim(p_analise->>'tituloSessao'), ''), titulo),
      orgao = v_orgao, tipo = v_tipo,
      data = v_data || 'T' || v_hora,
      local = nullif(trim(p_analise #>> '{sessao,local}'), ''),
      notas = v_entidade,
      dados_confirmados_at = now(), preparacao_estado = 'em_preparacao',
      revisao_final_confirmada_at = null, pronta_em = null, updated_at = now()
    where id = v_sessao_id and user_id = v_user;
    if not found then raise exception 'SESSAO_EXISTENTE_NAO_ENCONTRADA'; end if;
  else
    v_sessao_id := 'asm-' || gen_random_uuid()::text;
    insert into public.assembleias (
      id, user_id, titulo, tipo, orgao, data, local, estado, notas,
      dados_confirmados_at, preparacao_estado, created_at, updated_at
    ) values (
      v_sessao_id, v_user,
      coalesce(nullif(trim(p_analise->>'tituloSessao'), ''), 'Sessão de ' || v_data),
      v_tipo, v_orgao, v_data || 'T' || v_hora,
      nullif(trim(p_analise #>> '{sessao,local}'), ''), 'preparacao', v_entidade,
      now(), 'em_preparacao', now(), now()
    );
  end if;

  for v_ponto in select value from jsonb_array_elements(coalesce(p_analise->'pontosOrdemTrabalhos', '[]'::jsonb)) loop
    v_titulo := nullif(trim(v_ponto->>'titulo'), '');
    if v_titulo is null then raise exception 'PONTO_SEM_TITULO'; end if;
    if not exists (
      select 1 from public.pontos where user_id = v_user and assembleia_id = v_sessao_id
      and lower(trim(titulo)) = lower(v_titulo)
    ) then
      select coalesce(max(numero), 0) + 1 into v_numero from public.pontos
      where user_id = v_user and assembleia_id = v_sessao_id;
      insert into public.pontos (
        id, user_id, assembleia_id, numero, titulo, descricao, estado, prioridade,
        sentido_voto, created_at, updated_at
      ) values (
        'ponto-' || gen_random_uuid()::text, v_user, v_sessao_id, v_numero,
        v_titulo, nullif(trim(v_ponto->>'descricao'), ''), 'Por preparar', 'Média',
        'Por decidir', now(), now()
      );
      v_criados := v_criados + 1;
    end if;
  end loop;

  update public.documentos set
    assembleia_origem_id = v_sessao_id,
    origem_tipo = 'sessao', origem_ref = v_sessao_id,
    estado_analise = 'confirmado', analise_institucional = p_analise,
    analise_institucional_em = now(), updated_at = now()
  where id = p_documento_id and user_id = v_user;

  return jsonb_build_object(
    'status', 'confirmado', 'sessaoId', v_sessao_id,
    'pontosCriados', v_criados
  );
end;
$$;
