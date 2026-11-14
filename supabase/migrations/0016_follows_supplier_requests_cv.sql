-- ============================================================================
-- 0016_follows_supplier_requests_cv.sql
--   * follows           — "Seguir" between users (Home feed). Readable by any
--                         authenticated user; a user writes only their own rows.
--   * supplier_requests — contact / quote / order requests from the Mercado >
--                         Fornecedores catalogue. Suppliers live in the static
--                         SUPPLIERS list, so supplier_id is that list's id, not
--                         a foreign key. Clients insert and read their own rows.
--   * profiles.cv_path / cv_name — the user's published CV (file in the
--                         post-media bucket under their own folder).
-- ============================================================================

create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy "follows_select_authenticated"
  on public.follows for select to authenticated
  using (true);

create policy "follows_insert_own"
  on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);

create policy "follows_delete_own"
  on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

create table public.supplier_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  supplier_id   text not null,
  supplier_name text not null,
  kind          text not null check (kind in ('contact','quote','order')),
  product_ref   text not null default '',
  product_name  text not null default '',
  quantity      int check (quantity is null or quantity > 0),
  message       text not null,
  status        text not null default 'open' check (status in ('open','answered','closed')),
  created_at    timestamptz not null default now()
);

alter table public.supplier_requests enable row level security;

create policy "supplier_requests_select_own"
  on public.supplier_requests for select to authenticated
  using (auth.uid() = requester_id);

create policy "supplier_requests_insert_own"
  on public.supplier_requests for insert to authenticated
  with check (auth.uid() = requester_id and status = 'open');

alter table public.profiles
  add column if not exists cv_path text,
  add column if not exists cv_name text;
