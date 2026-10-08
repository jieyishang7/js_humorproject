-- Assignment 3: profiles table, auth.users trigger, and avatar storage.
-- Run this whole file once in Supabase Dashboard -> SQL Editor.
-- It is safe to run again: every statement checks whether it already exists.

-- 1. profiles table -----------------------------------------------------------
-- One row per signed-in user. `id` is the same UUID as auth.users.id, so the
-- two tables stay in sync and next week's RLS policies can use auth.uid().
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  first_name text,          -- nullable on purpose: the app asks for it after login
  last_name text,           -- nullable on purpose
  tagline text,             -- optional extra detail: "your humor in one line"
  avatar_url text,          -- public URL of the photo in Storage, never the image bytes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. trigger: create a profile row the first time someone signs in --------------
-- Signing in with Google for the first time inserts a row into auth.users;
-- this trigger copies the new user's id and email into public.profiles.
-- first_name / last_name are left empty so the app can prompt for them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill: anyone who already signed in before the trigger existed.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 3. Access rules for profiles ----------------------------------------------------
-- The assignment allows RLS off this week, but this table holds names and
-- emails and the anon key is public, so each user may only see and edit
-- their own row. (Rows are only ever created by the trigger above.)
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 4. Avatar storage -----------------------------------------------------------------
-- Photos live in a public Storage bucket; the database only stores their URL.
-- Each user uploads into a folder named after their user id: avatars/<uid>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can see their own avatar files" on storage.objects;
create policy "Users can see their own avatar files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
