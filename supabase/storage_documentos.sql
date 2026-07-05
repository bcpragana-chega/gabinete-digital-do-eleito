-- Storage policies for the private "documentos" bucket.
-- Expected object path:
-- documentos/{auth.uid()}/{documento_id}/{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 52428800, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documentos_storage_select_own" on storage.objects;
create policy "documentos_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documentos'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or (
      (storage.foldername(name))[1] in ('documentos', 'documents')
      and auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);

drop policy if exists "documentos_storage_insert_own" on storage.objects;
create policy "documentos_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or (
      (storage.foldername(name))[1] in ('documentos', 'documents')
      and auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);

drop policy if exists "documentos_storage_update_own" on storage.objects;
create policy "documentos_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documentos'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or (
      (storage.foldername(name))[1] in ('documentos', 'documents')
      and auth.uid()::text = (storage.foldername(name))[2]
    )
  )
)
with check (
  bucket_id = 'documentos'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or (
      (storage.foldername(name))[1] in ('documentos', 'documents')
      and auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);

drop policy if exists "documentos_storage_delete_own" on storage.objects;
create policy "documentos_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documentos'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or (
      (storage.foldername(name))[1] in ('documentos', 'documents')
      and auth.uid()::text = (storage.foldername(name))[2]
    )
  )
);
