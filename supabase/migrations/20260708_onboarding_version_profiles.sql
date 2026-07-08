alter table public.profiles
  add column if not exists onboarding_version integer not null default 0;

-- Utilizadores já existentes passam a onboarding concluído
update public.profiles
set onboarding_version = 1
where onboarding_version = 0;
