-- Experiência de demonstração individual para utilizadores anónimos.
--
-- Segurança:
--   * a função não recebe user_id e opera exclusivamente sobre auth.uid();
--   * apenas JWTs anónimos podem criar o cenário;
--   * toda a criação ocorre numa única transação;
--   * os IDs incluem o auth.uid(), evitando colisões entre demonstrações;
--   * as políticas RLS existentes continuam inalteradas e isoladas por user_id.

alter table public.profiles
  add column if not exists is_demo boolean not null default false,
  add column if not exists demo_seeded_at timestamptz;

create or replace function public.criar_demonstracao_tribuno()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_prefix text;
  v_today date := current_date;
  v_now timestamptz := now();
  v_existing_seed timestamptz;
  v_sessao_proxima text;
  v_sessao_extra text;
  v_sessao_anterior text;
  v_assunto_iluminacao text;
  v_assunto_parque text;
  v_assunto_praia text;
  v_assunto_multibanco text;
  v_assunto_passagem text;
  v_assunto_comercio text;
  v_ponto_iluminacao text;
  v_ponto_parque text;
  v_ponto_multibanco text;
  v_ponto_comercio text;
  v_ponto_praia text;
  v_ponto_passagem text;
  v_doc_praia text;
  v_doc_iluminacao text;
  v_doc_passagem text;
  v_doc_multibanco text;
  v_doc_comercio text;
  v_doc_parque text;
begin
  if v_user is null then
    raise exception 'DEMO_AUTH_REQUIRED';
  end if;

  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'DEMO_ANONYMOUS_SESSION_REQUIRED';
  end if;

  -- Serializa duas chamadas simultâneas do mesmo utilizador.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('tribuno-demo:' || v_user::text, 0)
  );

  select demo_seeded_at
    into v_existing_seed
  from public.profiles
  where user_id = v_user
    and is_demo is true;

  if v_existing_seed is not null then
    return jsonb_build_object(
      'status', 'already_created',
      'seeded_at', v_existing_seed
    );
  end if;

  if exists (select 1 from public.profiles where user_id = v_user) then
    raise exception 'DEMO_PROFILE_CONFLICT';
  end if;

  v_prefix := 'demo-' || v_user::text;
  v_sessao_proxima := v_prefix || '-sessao-proxima';
  v_sessao_extra := v_prefix || '-sessao-extraordinaria';
  v_sessao_anterior := v_prefix || '-sessao-anterior';
  v_assunto_iluminacao := v_prefix || '-assunto-iluminacao';
  v_assunto_parque := v_prefix || '-assunto-parque';
  v_assunto_praia := v_prefix || '-assunto-praia';
  v_assunto_multibanco := v_prefix || '-assunto-multibanco';
  v_assunto_passagem := v_prefix || '-assunto-passagem';
  v_assunto_comercio := v_prefix || '-assunto-comercio';
  v_ponto_iluminacao := v_prefix || '-ponto-iluminacao';
  v_ponto_parque := v_prefix || '-ponto-parque';
  v_ponto_multibanco := v_prefix || '-ponto-multibanco';
  v_ponto_comercio := v_prefix || '-ponto-comercio';
  v_ponto_praia := v_prefix || '-ponto-praia';
  v_ponto_passagem := v_prefix || '-ponto-passagem';
  v_doc_praia := v_prefix || '-doc-praia';
  v_doc_iluminacao := v_prefix || '-doc-iluminacao';
  v_doc_passagem := v_prefix || '-doc-passagem';
  v_doc_multibanco := v_prefix || '-doc-multibanco';
  v_doc_comercio := v_prefix || '-doc-comercio';
  v_doc_parque := v_prefix || '-doc-parque';

  insert into public.profiles (
    user_id, nome_institucional, cargo, orgao, organizacao, territorio,
    municipio, freguesia, assinatura_institucional, onboarding_version,
    last_login_at, updated_at, is_demo, demo_seeded_at
  ) values (
    v_user,
    'Miguel Andrade',
    'Membro da Assembleia de Freguesia',
    'Assembleia de Freguesia',
    'Assembleia de Freguesia de Vila Nova',
    'Vila Nova',
    'Santa Clara',
    'Vila Nova',
    E'Miguel Andrade\nMembro da Assembleia de Freguesia de Vila Nova',
    1,
    v_now,
    v_now,
    true,
    v_now
  );

  insert into public.assembleias (
    id, user_id, titulo, tipo, orgao, data, local, estado, preparacao_estado,
    dados_confirmados_at, revisao_final_confirmada_at, pronta_em, notas,
    created_at, updated_at
  ) values
    (
      v_sessao_proxima, v_user, 'Sessão ordinária de setembro', 'Ordinária',
      'Assembleia de Freguesia',
      pg_catalog.to_char(v_today + 7, 'YYYY-MM-DD') || 'T19:00',
      'Salão da Assembleia de Vila Nova', 'preparacao', 'em_preparacao',
      v_now - interval '2 days', null, null,
      'Convocatória recebida. Falta concluir a recomendação sobre iluminação e rever a intervenção sobre comércio local.',
      v_now - interval '9 days', v_now - interval '1 day'
    ),
    (
      v_sessao_extra, v_user, 'Sessão extraordinária sobre mobilidade e segurança',
      'Extraordinária', 'Assembleia de Freguesia',
      pg_catalog.to_char(v_today - 20, 'YYYY-MM-DD') || 'T18:30',
      'Salão da Assembleia de Vila Nova', 'concluida', 'pronta',
      v_now - interval '28 days', v_now - interval '22 days', v_now - interval '22 days',
      'Sessão concluída. Requerimento apresentado e compromisso de intervenção registado.',
      v_now - interval '30 days', v_now - interval '20 days'
    ),
    (
      v_sessao_anterior, v_user, 'Sessão ordinária de julho', 'Ordinária',
      'Assembleia de Freguesia',
      pg_catalog.to_char(v_today - 50, 'YYYY-MM-DD') || 'T19:00',
      'Salão da Assembleia de Vila Nova', 'concluida', 'pronta',
      v_now - interval '60 days', v_now - interval '52 days', v_now - interval '52 days',
      'Ata revista. Recomendação aprovada e pedidos de esclarecimento enviados.',
      v_now - interval '64 days', v_now - interval '49 days'
    );

  insert into public.assuntos (
    id, user_id, titulo, descricao, estado, prioridade, tags, objetivo_politico,
    created_at, updated_at
  ) values
    (
      v_assunto_iluminacao, v_user,
      'Reforço da iluminação pública na Rua das Amendoeiras',
      'Moradores sinalizaram troços com iluminação insuficiente entre o largo e a zona residencial. Está em preparação uma recomendação para a próxima sessão.',
      'ativo', 'Alta', array['espaço público', 'segurança', 'pronto para sessão'],
      'Concluir a recomendação e apresentá-la na próxima sessão.',
      v_now - interval '38 days', v_now - interval '1 day'
    ),
    (
      v_assunto_parque, v_user,
      'Reparação e acessibilidade do Parque Infantil da Fonte',
      'O piso amortecedor apresenta desgaste e o acesso principal não permite uma utilização autónoma por pessoas com mobilidade condicionada.',
      'ativo', 'Média', array['acessibilidade', 'famílias', 'em análise'],
      'Reunir evidência e fechar uma proposta de intervenção faseada.',
      v_now - interval '31 days', v_now - interval '4 days'
    ),
    (
      v_assunto_praia, v_user,
      'Limpeza e manutenção do acesso à Praia do Vale Sereno',
      'Foi pedido um calendário de limpeza, corte de vegetação e verificação das condições do percurso pedonal.',
      'em acompanhamento', 'Alta', array['ambiente', 'manutenção', 'a aguardar resposta'],
      'Analisar a resposta da Junta e confirmar o calendário de manutenção.',
      v_now - interval '58 days', v_now - interval '3 days'
    ),
    (
      v_assunto_multibanco, v_user,
      'Instalação de uma caixa multibanco no centro da freguesia',
      'A inexistência de um ponto de levantamento próximo afeta residentes, visitantes e o comércio de proximidade.',
      'em acompanhamento', 'Média', array['serviços', 'comércio', 'apresentado'],
      'Acompanhar os contactos com operadores e identificar um local viável.',
      v_now - interval '54 days', v_now - interval '12 days'
    ),
    (
      v_assunto_passagem, v_user,
      'Segurança da passagem pedonal junto à Escola Básica de Vila Nova',
      'A visibilidade da passadeira é reduzida nas horas de entrada e saída. Foi solicitado reforço de sinalização e análise de medidas de acalmia de tráfego.',
      'em acompanhamento', 'Crítica', array['mobilidade', 'escola', 'resposta recebida'],
      'Avaliar a resposta recebida e confirmar prazo para a intervenção.',
      v_now - interval '46 days', v_now - interval '2 days'
    ),
    (
      v_assunto_comercio, v_user,
      'Plano de apoio e dinamização do comércio local',
      'Proposta de calendário de iniciativas, comunicação conjunta e simplificação do contacto entre comerciantes e serviços locais.',
      'concluido', 'Média', array['economia local', 'aprovado', 'concluído'],
      'Registar os resultados e acompanhar a execução do calendário aprovado.',
      v_now - interval '63 days', v_now - interval '18 days'
    );

  insert into public.pontos (
    id, user_id, assembleia_id, numero, titulo, descricao, estado, prioridade,
    objetivo_politico, posicao_politica, mensagem_principal, riscos,
    linha_intervencao, notas_internas, sentido_voto, tempo_estimado,
    created_at, updated_at
  ) values
    (
      v_ponto_iluminacao, v_user, v_sessao_proxima, 1,
      'Iluminação pública na Rua das Amendoeiras',
      'Discussão da recomendação para levantamento técnico e reforço dos pontos de luz.',
      'Em preparação', 'Alta',
      'Obter um compromisso com calendário verificável.',
      'Favorável ao reforço, com prioridade aos troços de maior circulação pedonal.',
      'A segurança dos percursos diários exige uma resposta calendarizada.',
      'Evitar compromissos sem prazo.',
      'Apresentar os locais sinalizados, fundamentar o pedido e solicitar datas.',
      'Confirmar a formulação final da recomendação.', 'A favor', 15,
      v_now - interval '8 days', v_now - interval '1 day'
    ),
    (
      v_ponto_parque, v_user, v_sessao_proxima, 2,
      'Acessibilidade do Parque Infantil da Fonte',
      'Estado do piso, acesso inclusivo e prioridades de reparação.',
      'Preparado', 'Média',
      'Garantir acesso inclusivo e condições de segurança.',
      'Defender intervenção faseada com prioridade ao acesso e ao piso.',
      'Um espaço público infantil deve poder ser usado em segurança por todas as famílias.',
      'Validar custos antes de propor prazos fechados.',
      'Apresentar problemas observados e pedir plano de execução.',
      'Fotografias e notas de visita já organizadas.', 'A favor', 12,
      v_now - interval '8 days', v_now - interval '2 days'
    ),
    (
      v_ponto_multibanco, v_user, v_sessao_proxima, 3,
      'Serviços de proximidade e caixa multibanco',
      'Ponto de situação dos contactos para instalação de terminal multibanco.',
      'Por preparar', 'Média', 'Obter uma decisão sobre localização e próximos contactos.',
      'Favorável, condicionada à segurança e acessibilidade da localização.',
      'O acesso a numerário continua a ser um serviço de proximidade relevante.',
      'Não criar expectativas antes da confirmação do operador.',
      'Perguntar por contactos realizados, critérios e prazo de resposta.',
      'Recolher estimativa de utilização junto dos comerciantes.', 'Por decidir', 10,
      v_now - interval '7 days', v_now - interval '5 days'
    ),
    (
      v_ponto_comercio, v_user, v_sessao_proxima, 4,
      'Dinamização do comércio local',
      'Acompanhamento do calendário de iniciativas aprovado.',
      'Em preparação', 'Média', 'Confirmar responsáveis e primeira data do calendário.',
      'Apoiar o plano e garantir indicadores simples de execução.',
      'O plano deve passar rapidamente da aprovação à execução.',
      'Evitar dispersão de iniciativas sem responsáveis.',
      'Reconhecer o trabalho feito e pedir a calendarização operacional.',
      'Intervenção em revisão.', 'A favor', 8,
      v_now - interval '7 days', v_now - interval '3 days'
    ),
    (
      v_ponto_passagem, v_user, v_sessao_extra, 1,
      'Segurança pedonal junto à Escola Básica',
      'Medidas urgentes de sinalização e acalmia de tráfego.',
      'Concluído', 'Alta', 'Obter compromisso de intervenção.',
      'Defesa de intervenção imediata e estudo complementar.',
      'A segurança da comunidade escolar exige medidas visíveis.',
      null, 'Apresentar o requerimento e solicitar resposta formal.',
      'Requerimento apresentado.', 'A favor', 20,
      v_now - interval '27 days', v_now - interval '20 days'
    ),
    (
      v_ponto_praia, v_user, v_sessao_anterior, 1,
      'Manutenção do acesso à Praia do Vale Sereno',
      'Calendário de limpeza e manutenção preventiva do acesso.',
      'Concluído', 'Alta', 'Garantir manutenção regular durante todo o ano.',
      'Favorável a um calendário público de intervenções.',
      'A manutenção preventiva reduz riscos e custos.',
      null, 'Solicitar calendário e responsável operacional.',
      'Pedido de esclarecimento entregue.', 'A favor', 15,
      v_now - interval '58 days', v_now - interval '49 days'
    );

  insert into public.assunto_sessoes (user_id, assunto_id, sessao_id, created_at, updated_at)
  values
    (v_user, v_assunto_iluminacao, v_sessao_proxima, v_now - interval '8 days', v_now),
    (v_user, v_assunto_parque, v_sessao_proxima, v_now - interval '8 days', v_now),
    (v_user, v_assunto_multibanco, v_sessao_proxima, v_now - interval '7 days', v_now),
    (v_user, v_assunto_comercio, v_sessao_proxima, v_now - interval '7 days', v_now),
    (v_user, v_assunto_passagem, v_sessao_extra, v_now - interval '27 days', v_now),
    (v_user, v_assunto_praia, v_sessao_anterior, v_now - interval '58 days', v_now);

  insert into public.assunto_pontos (user_id, assunto_id, ponto_id, created_at, updated_at)
  values
    (v_user, v_assunto_iluminacao, v_ponto_iluminacao, v_now - interval '8 days', v_now),
    (v_user, v_assunto_parque, v_ponto_parque, v_now - interval '8 days', v_now),
    (v_user, v_assunto_multibanco, v_ponto_multibanco, v_now - interval '7 days', v_now),
    (v_user, v_assunto_comercio, v_ponto_comercio, v_now - interval '7 days', v_now),
    (v_user, v_assunto_passagem, v_ponto_passagem, v_now - interval '27 days', v_now),
    (v_user, v_assunto_praia, v_ponto_praia, v_now - interval '58 days', v_now);

  insert into public.documentos_criados (
    id, user_id, titulo, tipo, estado, conteudo, formato_conteudo, resumo, tags,
    origem, assunto_id, assembleia_id, ponto_id, created_at, updated_at,
    finalizado_em, apresentado_em
  ) values
    (
      v_doc_praia, v_user,
      'Pedido de esclarecimento sobre a limpeza do acesso à Praia do Vale Sereno',
      'requerimento', 'apresentado',
      E'Exmo. Senhor Presidente da Junta de Freguesia de Vila Nova,\n\nNos termos regimentais, solicita-se informação sobre o calendário previsto para a limpeza, corte de vegetação e manutenção do acesso pedonal à Praia do Vale Sereno, bem como a identificação do serviço responsável pela sua execução.\n\nSolicita-se resposta por escrito.',
      'plain_text',
      'Pedido de calendário e responsabilidade pela manutenção do acesso à praia.',
      array['ambiente', 'manutenção'], 'manual',
      v_assunto_praia, v_sessao_anterior, v_ponto_praia,
      v_now - interval '55 days', v_now - interval '49 days',
      v_now - interval '51 days', v_now - interval '50 days'
    ),
    (
      v_doc_iluminacao, v_user,
      'Recomendação para reforço da iluminação pública na Rua das Amendoeiras',
      'recomendacao', 'em_revisao',
      E'A Assembleia de Freguesia de Vila Nova recomenda à Junta de Freguesia que promova, junto da entidade competente, um levantamento das condições de iluminação na Rua das Amendoeiras e apresente um plano calendarizado para o reforço dos pontos de luz nos troços identificados.\n\nA recomendação fundamenta-se na segurança dos percursos pedonais e na prevenção de situações de risco.',
      'plain_text',
      'Recomendação em revisão para a próxima sessão ordinária.',
      array['iluminação', 'segurança'], 'manual',
      v_assunto_iluminacao, v_sessao_proxima, v_ponto_iluminacao,
      v_now - interval '10 days', v_now - interval '1 day', null, null
    ),
    (
      v_doc_passagem, v_user,
      'Requerimento sobre a segurança da passagem pedonal junto à Escola Básica',
      'requerimento', 'apresentado',
      E'Exmo. Senhor Presidente da Junta de Freguesia de Vila Nova,\n\nSolicita-se informação sobre as medidas previstas para melhorar a visibilidade e a segurança da passagem pedonal junto à Escola Básica de Vila Nova, incluindo reforço de sinalização, iluminação e eventual adoção de medidas de acalmia de tráfego.\n\nAtenta a utilização diária pela comunidade escolar, solicita-se indicação do prazo previsto para intervenção.',
      'plain_text',
      'Requerimento apresentado na sessão extraordinária.',
      array['mobilidade', 'segurança escolar'], 'manual',
      v_assunto_passagem, v_sessao_extra, v_ponto_passagem,
      v_now - interval '26 days', v_now - interval '20 days',
      v_now - interval '22 days', v_now - interval '20 days'
    ),
    (
      v_doc_multibanco, v_user,
      'Recomendação para instalação de caixa multibanco no centro de Vila Nova',
      'recomendacao', 'final',
      E'A Assembleia de Freguesia de Vila Nova recomenda à Junta de Freguesia que avalie, com operadores habilitados, a instalação de uma caixa multibanco no centro da freguesia, em local acessível, seguro e com utilização previsível suficiente.\n\nRecomenda-se ainda que o resultado dos contactos seja comunicado à Assembleia.',
      'plain_text',
      'Recomendação concluída sobre serviço de proximidade.',
      array['serviços', 'comércio local'], 'manual',
      v_assunto_multibanco, v_sessao_anterior, null,
      v_now - interval '48 days', v_now - interval '43 days',
      v_now - interval '43 days', null
    ),
    (
      v_doc_comercio, v_user,
      'Intervenção sobre o plano de dinamização do comércio local',
      'intervencao', 'pronto',
      E'Senhor Presidente, Senhoras e Senhores Membros,\n\nA dinamização do comércio local exige continuidade, calendário e responsáveis identificados. Propõe-se que as iniciativas previstas sejam organizadas num plano simples, com datas, canais de divulgação e um ponto de contacto para os comerciantes.\n\nImporta agora transformar o consenso alcançado em execução visível.',
      'plain_text',
      'Intervenção pronta para acompanhamento do plano aprovado.',
      array['economia local', 'intervenção'], 'manual',
      v_assunto_comercio, v_sessao_proxima, v_ponto_comercio,
      v_now - interval '6 days', v_now - interval '3 days',
      v_now - interval '3 days', null
    ),
    (
      v_doc_parque, v_user,
      'Proposta de acessibilidade do Parque Infantil da Fonte',
      'recomendacao', 'rascunho',
      E'Propõe-se a reparação do piso amortecedor e a criação de um acesso contínuo e sem barreiras ao Parque Infantil da Fonte.\n\nA intervenção deverá ser faseada segundo critérios de segurança, acessibilidade e disponibilidade orçamental.',
      'plain_text',
      'Rascunho a completar após recolha de estimativa de custos.',
      array['acessibilidade', 'espaço público'], 'manual',
      v_assunto_parque, v_sessao_proxima, v_ponto_parque,
      v_now - interval '5 days', v_now - interval '4 days', null, null
    );

  insert into public.acompanhamentos_politicos (
    id, user_id, assunto_id, documento_criado_id, tipo, data, descricao,
    destinatario, prazo, proxima_acao_em, estado, created_at, updated_at
  ) values
    (
      v_prefix || '-acomp-praia', v_user, v_assunto_praia, v_doc_praia,
      'entrega', v_today - 50, 'A aguardar resposta da Junta',
      'Junta de Freguesia de Vila Nova', v_today + 5, v_today + 6,
      'a_aguardar', v_now - interval '50 days', v_now - interval '3 days'
    ),
    (
      v_prefix || '-acomp-passagem', v_user, v_assunto_passagem, v_doc_passagem,
      'resposta', v_today - 2, 'Resposta recebida — analisar',
      'Junta de Freguesia de Vila Nova', null, v_today,
      'resposta_recebida', v_now - interval '2 days', v_now - interval '2 days'
    ),
    (
      v_prefix || '-acomp-multibanco', v_user, v_assunto_multibanco, v_doc_multibanco,
      'resolucao', v_today - 42, 'Recomendação aprovada',
      'Assembleia de Freguesia de Vila Nova', null, null,
      'resolvido', v_now - interval '42 days', v_now - interval '42 days'
    ),
    (
      v_prefix || '-acomp-seguranca', v_user, v_assunto_passagem, v_doc_passagem,
      'nota', v_today - 20, 'Executivo comprometeu-se a intervir',
      'Junta de Freguesia de Vila Nova', v_today + 10, v_today + 4,
      'exige_acao', v_now - interval '20 days', v_now - interval '6 days'
    );

  return jsonb_build_object(
    'status', 'created',
    'seeded_at', v_now,
    'sessions', 3,
    'subjects', 6,
    'documents', 6,
    'follow_ups', 4
  );
end;
$$;

revoke all on function public.criar_demonstracao_tribuno() from public;
grant execute on function public.criar_demonstracao_tribuno() to authenticated;

comment on function public.criar_demonstracao_tribuno() is
  'Cria, de forma transacional e idempotente, dados fictícios isolados para o auth.uid() anónimo atual.';

comment on column public.profiles.is_demo is
  'Identifica perfis criados pela experiência de demonstração anónima.';

comment on column public.profiles.demo_seeded_at is
  'Momento em que o cenário de demonstração foi criado com sucesso.';

-- Limpeza futura (não automatizada nesta versão):
-- 1. selecionar auth.users anónimos antigos, usando is_anonymous/created_at e um período de retenção;
-- 2. eliminar os utilizadores em lotes através de uma rotina administrativa auditada;
-- 3. deixar ON DELETE CASCADE remover profiles, assembleias, pontos, assuntos,
--    assunto_sessoes, assunto_pontos e acompanhamentos_politicos;
-- 4. documentos_criados também são removidos pelo user_id; as FKs internas usam
--    CASCADE/SET NULL conforme a arquitetura atual;
-- 5. antes de ativar a rotina, validar contagens, storage por prefixo de utilizador
--    e manter métricas/alertas. Não executar esta limpeza a partir do browser.
