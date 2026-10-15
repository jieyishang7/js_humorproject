-- Week 5: "Add to my plan" — members save AI-recommended spots.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to run again.
create table if not exists public.saved_spots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  caption_id bigint not null references public.captions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, caption_id)
);
alter table public.saved_spots enable row level security;
revoke all on public.saved_spots from anon, authenticated;
grant select, insert, delete on public.saved_spots to authenticated;
drop policy if exists "Members manage their own plan" on public.saved_spots;
create policy "Members manage their own plan" on public.saved_spots
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
