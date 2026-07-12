create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome_institucional text not null,
  cargo text not null,
  orgao text not null,
  organizacao text not null,
  territorio text not null,
  assinatura_institucional text,
  logo_url text,
  onboarding_version integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists logo_url text;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "logos_storage_select_public" on storage.objects;
create policy "logos_storage_select_public"
on storage.objects
for select
using (bucket_id = 'logos');

drop policy if exists "logos_storage_insert_own" on storage.objects;
create policy "logos_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "logos_storage_update_own" on storage.objects;
create policy "logos_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
