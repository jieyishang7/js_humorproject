-- Week 7 extra: AI-generated pictures for recommended spots.
-- The image file lives in the public `uploads` bucket (uploads/<user id>/spots/...);
-- this table keeps one row per generated picture. Safe to run again.

create table if not exists public.spot_images (
  id bigint generated always as identity primary key,
  caption_id bigint not null references public.captions (id) on delete cascade,
  image_url text not null,
  model text,
  prompt text,
  profile_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_datetime_utc timestamptz not null default now()
);

create index if not exists spot_images_caption_idx on public.spot_images (caption_id);

alter table public.spot_images enable row level security;
revoke all on public.spot_images from anon;
grant select, insert, delete on public.spot_images to authenticated;

drop policy if exists "Members see spot images" on public.spot_images;
create policy "Members see spot images" on public.spot_images for select to authenticated using (true);

drop policy if exists "Members add own spot images" on public.spot_images;
create policy "Members add own spot images" on public.spot_images for insert to authenticated
  with check ((select auth.uid()) = profile_id);

drop policy if exists "Admins manage spot images" on public.spot_images;
create policy "Admins manage spot images" on public.spot_images for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());
