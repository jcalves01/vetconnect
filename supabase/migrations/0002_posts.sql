-- ============================================================================
-- 0002_posts.sql
-- Feed posts + attachments (Supabase Storage) + likes + comments.
-- ============================================================================

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  type           text not null default 'post' check (type in ('post','clinical','event')),
  content        text not null default '',
  tags           text[] not null default '{}',
  soap           jsonb,
  likes_count    int not null default 0,
  comments_count int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts_select_authenticated" on public.posts for select to authenticated using (true);
create policy "posts_insert_own" on public.posts for insert to authenticated with check (auth.uid() = author_id);
create policy "posts_update_own" on public.posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "posts_delete_own" on public.posts for delete to authenticated using (auth.uid() = author_id);

create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Attachments (photo/video/doc). The actual bytes live in Supabase Storage
-- (bucket "post-media", see below) — this table only stores the resulting
-- public URL plus metadata.
-- ---------------------------------------------------------------------------
create table public.post_attachments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  type       text not null check (type in ('image','video','doc')),
  url        text not null,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.post_attachments enable row level security;

create policy "post_attachments_select_authenticated" on public.post_attachments for select to authenticated using (true);
create policy "post_attachments_insert_own_post" on public.post_attachments for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "post_attachments_delete_own_post" on public.post_attachments for delete to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Likes. likes_count on posts is kept in sync by trigger, so the feed can
-- read/sort by count without a join+count() on every render.
-- ---------------------------------------------------------------------------
create table public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "post_likes_select_authenticated" on public.post_likes for select to authenticated using (true);
create policy "post_likes_insert_own" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "post_likes_delete_own" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.handle_post_like_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger post_likes_after_insert after insert on public.post_likes
  for each row execute function public.handle_post_like_change();
create trigger post_likes_after_delete after delete on public.post_likes
  for each row execute function public.handle_post_like_change();

-- ---------------------------------------------------------------------------
-- Comments. comments_count on posts kept in sync the same way as likes.
-- ---------------------------------------------------------------------------
create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "post_comments_select_authenticated" on public.post_comments for select to authenticated using (true);
create policy "post_comments_insert_own" on public.post_comments for insert to authenticated with check (auth.uid() = author_id);
create policy "post_comments_delete_own" on public.post_comments for delete to authenticated using (auth.uid() = author_id);

create or replace function public.handle_post_comment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger post_comments_after_insert after insert on public.post_comments
  for each row execute function public.handle_post_comment_change();
create trigger post_comments_after_delete after delete on public.post_comments
  for each row execute function public.handle_post_comment_change();

-- ---------------------------------------------------------------------------
-- Storage bucket for post photos/videos/docs. Public read: the feed renders
-- attachment URLs directly as <img>/<video> src, so signed URLs would add
-- real complexity for little benefit here — the app already gates the whole
-- feed behind login; the only gap this leaves is that someone who obtains a
-- direct file URL could view that one file without logging in.
--
-- Uploads must be written under a path starting with the uploader's own
-- auth.uid() (e.g. `${user.id}/${filename}`) — enforced by the insert policy
-- below via storage.foldername().
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "post_media_public_read"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "post_media_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "post_media_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
