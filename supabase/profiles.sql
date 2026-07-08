create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome_institucional text not null,
  cargo text not null,
  orgao text not null,
  organizacao text not null,
  territorio text not null,
  assinatura_institucional text,
  onboarding_version integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

