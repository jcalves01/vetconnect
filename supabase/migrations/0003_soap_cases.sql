-- ============================================================================
-- 0003_soap_cases.sql
-- SOAP clinical cases (the dedicated Clinic > Casos SOAP tab) + comments.
-- Same shape as 0002_posts.sql's posts/comments pair, applied to soap_cases.
-- ============================================================================

create table public.soap_cases (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  species       text not null default '',
  breed         text not null default '',
  age           text not null default '',
  sex           text not null default '',
  status        text not null default 'Em discussão' check (status in ('Em discussão','Resolvido')),
  subjective    text not null default '',
  objective     text not null default '',
  assessment    text not null default '',
  plan          text not null default '',
  replies_count int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.soap_cases enable row level security;

create policy "soap_cases_select_authenticated" on public.soap_cases for select to authenticated using (true);
create policy "soap_cases_insert_own" on public.soap_cases for insert to authenticated with check (auth.uid() = author_id);
create policy "soap_cases_update_own" on public.soap_cases for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "soap_cases_delete_own" on public.soap_cases for delete to authenticated using (auth.uid() = author_id);

create trigger soap_cases_set_updated_at before update on public.soap_cases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Comments (clinical discussion thread under a case). replies_count on
-- soap_cases kept in sync by trigger, same pattern as post_comments.
-- ---------------------------------------------------------------------------
create table public.soap_case_comments (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.soap_cases(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

alter table public.soap_case_comments enable row level security;

create policy "soap_case_comments_select_authenticated" on public.soap_case_comments for select to authenticated using (true);
create policy "soap_case_comments_insert_own" on public.soap_case_comments for insert to authenticated with check (auth.uid() = author_id);
create policy "soap_case_comments_delete_own" on public.soap_case_comments for delete to authenticated using (auth.uid() = author_id);

create or replace function public.handle_soap_case_comment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.soap_cases set replies_count = replies_count + 1 where id = new.case_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.soap_cases set replies_count = greatest(replies_count - 1, 0) where id = old.case_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger soap_case_comments_after_insert after insert on public.soap_case_comments
  for each row execute function public.handle_soap_case_comment_change();
create trigger soap_case_comments_after_delete after delete on public.soap_case_comments
  for each row execute function public.handle_soap_case_comment_change();
