-- Week 5: "Spot Finder NYC" — members describe a mood, the AI recommends places,
-- everyone votes on the recommendations.
-- Run this whole file once in Supabase Dashboard -> SQL Editor. Safe to run again.

-- 1. spot_requests: one row per "what are you in the mood for?" ------------------
create table if not exists public.spot_requests (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mood text not null check (char_length(mood) between 3 and 200),
  created_at timestamptz not null default now()
);

alter table public.spot_requests enable row level security;

revoke all on public.spot_requests from anon, authenticated;
grant select on public.spot_requests to anon, authenticated;
grant insert on public.spot_requests to authenticated;

drop policy if exists "Anyone can read spot requests" on public.spot_requests;
create policy "Anyone can read spot requests"
  on public.spot_requests for select
  to anon, authenticated
  using (true);

drop policy if exists "Members can add their own spot requests" on public.spot_requests;
create policy "Members can add their own spot requests"
  on public.spot_requests for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

-- 2. Each AI recommendation is stored as a row in captions, linked to its request -----
alter table public.captions add column if not exists request_id bigint references public.spot_requests (id) on delete cascade;

alter table public.captions drop constraint if exists captions_one_image;
alter table public.captions
  add constraint captions_one_image check (num_nonnulls(joke_id, upload_id, request_id) = 1);

-- 3. Signed-out visitors may read recommendations and vote totals (voting still needs login).
grant select on public.captions to anon;
grant select on public.caption_votes to anon;

drop policy if exists "Anyone can read captions" on public.captions;
create policy "Anyone can read captions"
  on public.captions for select
  to anon
  using (true);

drop policy if exists "Anyone can read vote totals" on public.caption_votes;
create policy "Anyone can read vote totals"
  on public.caption_votes for select
  to anon
  using (true);
