create table if not exists public.ai_usage (
  id text primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id text,
  assunto_id text references public.assuntos(id) on delete set null,
  documento_id text references public.documentos_criados(id) on delete set null,
  provider text not null,
  model text not null,
  operation text not null default 'generate_document',
  feature text not null,
  document_type text not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  estimated_cost_input numeric(12,6) not null default 0,
  estimated_cost_output numeric(12,6) not null default 0,
  estimated_cost_total numeric(12,6) not null default 0,
  duration_ms integer,
  status text not null default 'success',
  error_code text
);

create index if not exists ai_usage_created_at_idx on public.ai_usage(created_at desc);
create index if not exists ai_usage_user_id_idx on public.ai_usage(user_id);
create index if not exists ai_usage_organization_id_idx on public.ai_usage(organization_id);
create index if not exists ai_usage_assunto_id_idx on public.ai_usage(assunto_id);
create index if not exists ai_usage_documento_id_idx on public.ai_usage(documento_id);
create index if not exists ai_usage_provider_idx on public.ai_usage(provider);
create index if not exists ai_usage_model_idx on public.ai_usage(model);
create index if not exists ai_usage_operation_idx on public.ai_usage(operation);
create index if not exists ai_usage_feature_idx on public.ai_usage(feature);
create index if not exists ai_usage_status_idx on public.ai_usage(status);

alter table public.ai_usage enable row level security;

-- No client-side policies on purpose: the table is intended for backend/admin usage only.
-- The backend writes with the Supabase service role key, and future admin dashboards
-- should query it from server-side code.
