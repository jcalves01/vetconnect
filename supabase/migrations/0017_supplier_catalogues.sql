-- ============================================================================
-- 0017_supplier_catalogues.sql
-- Catalogues and price lists uploaded on a supplier page (Mercado > Fornecedores).
--   * supplier_applications.catalog_supplier_id — which catalogue supplier (the
--     static SUPPLIERS id, as text) an approved application may upload for.
--     Clients cannot set it: there is no client update policy, and the insert
--     policy from 0015 is unchanged. Approval is done in the database.
--   * supplier_documents — one row per uploaded file. Readable by any
--     authenticated user; inserted only by an approved supplier for that
--     catalogue; deleted only by its uploader.
-- ============================================================================

alter table public.supplier_applications
  add column if not exists catalog_supplier_id text;

create table public.supplier_documents (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  text not null,
  uploader_id  uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  path         text not null,
  size_bytes   int not null check (size_bytes > 0),
  created_at   timestamptz not null default now()
);

create index supplier_documents_supplier_idx on public.supplier_documents (supplier_id);

alter table public.supplier_documents enable row level security;

create policy "supplier_documents_select_authenticated"
  on public.supplier_documents for select to authenticated
  using (true);

create policy "supplier_documents_insert_approved_supplier"
  on public.supplier_documents for insert to authenticated
  with check (
    auth.uid() = uploader_id
    and exists (
      select 1 from public.supplier_applications a
      where a.applicant_id = auth.uid()
        and a.status = 'approved'
        and a.catalog_supplier_id = supplier_documents.supplier_id
    )
  );

create policy "supplier_documents_delete_own"
  on public.supplier_documents for delete to authenticated
  using (auth.uid() = uploader_id);
