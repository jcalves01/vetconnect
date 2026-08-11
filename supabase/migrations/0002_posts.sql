-- ============================================================================
-- 0002_posts.sql
-- Feed posts, likes, flat comments.
-- ============================================================================

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index posts_author_id_idx  on public.posts (author_id);
create index posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

create policy "posts_select_authenticated"
  on public.posts for select
  to authenticated
  using (true);

create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "posts_delete_own"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Likes: one row per (post, user); toggle via insert/delete, no update needed.
-- ---------------------------------------------------------------------------
create table public.post_likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_id_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

create policy "post_likes_select_authenticated"
  on public.post_likes for select
  to authenticated
  using (true);

create policy "post_likes_insert_own"
  on public.post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "post_likes_delete_own"
  on public.post_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Comments: flat (no parent_comment_id).
-- ---------------------------------------------------------------------------
create table public.post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index post_comments_post_id_idx on public.post_comments (post_id, created_at);

alter table public.post_comments enable row level security;

create policy "post_comments_select_authenticated"
  on public.post_comments for select
  to authenticated
  using (true);

create policy "post_comments_insert_own"
  on public.post_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "post_comments_update_own"
  on public.post_comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "post_comments_delete_own"
  on public.post_comments for delete
  to authenticated
  using (auth.uid() = author_id);
