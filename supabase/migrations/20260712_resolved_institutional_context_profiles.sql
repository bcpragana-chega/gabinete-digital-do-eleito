alter table public.profiles
  add column if not exists municipio text,
  add column if not exists freguesia text;

update public.profiles
set
  municipio = case
    when municipio is not null then municipio
    when orgao in ('Assembleia Municipal', 'Câmara Municipal') then territorio
    else municipio
  end;
