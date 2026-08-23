-- ============================================================================
-- 0011_market_items.sql
-- Marketplace listings (Market > Marketplace), same posting pattern as jobs.
--
-- The mock MARKET_ITEMS had fake "rating"/"verified" fields with no review
-- or verification system behind them — dropped rather than persisted, same
-- call as jobs' fake "match %" in 0004.
-- ============================================================================

create table public.market_items (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  cat         text not null default 'Equipamento' check (cat in ('Equipamento','Negócio','Stock')),
  price       text not null,
  cond        text not null default 'Novo',
  loc         text not null default '',
  img         text not null default '📦',
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.market_items enable row level security;

create policy "market_items_select_authenticated" on public.market_items for select to authenticated using (true);
create policy "market_items_insert_own" on public.market_items for insert to authenticated with check (auth.uid() = seller_id);
create policy "market_items_update_own" on public.market_items for update to authenticated using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
create policy "market_items_delete_own" on public.market_items for delete to authenticated using (auth.uid() = seller_id);

create trigger market_items_set_updated_at before update on public.market_items
  for each row execute function public.set_updated_at();
