-- Assignment 4 (part 2): members upload their own photos for the AI to caption.
-- Run this whole file once in Supabase Dashboard -> SQL Editor, after
-- 20261008_captions_and_votes.sql. Safe to run again.

-- 1. uploads: one row per photo a member uploads ------------------------------------
-- The photo itself lives in Storage; only its public URL is stored here.
create table if not exists public.uploads (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.uploads enable row level security;

revoke all on public.uploads from anon, authenticated;
grant select, insert on public.uploads to authenticated;

drop policy if exists "Members can see uploads" on public.uploads;
create policy "Members can see uploads"
  on public.uploads for select
  to authenticated
  using (true);

drop policy if exists "Members can add their own uploads" on public.uploads;
create policy "Members can add their own uploads"
  on public.uploads for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

-- 2. A caption now belongs to either a gallery joke or an uploaded photo -------------
alter table public.captions alter column joke_id drop not null;
alter table public.captions add column if not exists upload_id bigint references public.uploads (id) on delete cascade;

alter table public.captions drop constraint if exists captions_one_image;
alter table public.captions
  add constraint captions_one_image check (num_nonnulls(joke_id, upload_id) = 1);

-- 3. Storage bucket for uploaded photos ----------------------------------------------
-- Public so the images can be shown; each member writes only to uploads/<their id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can upload photos to their folder" on storage.objects;
create policy "Members can upload photos to their folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
