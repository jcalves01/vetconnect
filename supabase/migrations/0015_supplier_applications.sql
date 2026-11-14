-- ============================================================================
-- 0015_supplier_applications.sql
-- "Ser fornecedor" requests from the Mercado > Fornecedores tab.
-- One application per user. Clients can read their own request and insert a
-- new pending one; they cannot change the status. Review (approved/rejected)
-- is done outside the app, with the service role or in the SQL editor.
-- ============================================================================

create table public.supplier_applications (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null unique references public.profiles (id) on delete cascade,
  company_name  text not null,
  category      text not null default '',
  description   text not null default '',
  contact_email text not null,
  contact_phone text not null default '',
  website       text not null default '',
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);

alter table public.supplier_applications enable row level security;

create policy "supplier_applications_select_own"
  on public.supplier_applications for select to authenticated
  using (auth.uid() = applicant_id);

create policy "supplier_applications_insert_own_pending"
  on public.supplier_applications for insert to authenticated
  with check (auth.uid() = applicant_id and status = 'pending');
