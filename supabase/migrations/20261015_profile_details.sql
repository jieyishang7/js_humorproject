-- Week 5: richer profiles. Used on the Profile page and to personalize AI picks.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to run again.
alter table public.profiles add column if not exists current_area text;
alter table public.profiles add column if not exists cities_visited text;
alter table public.profiles add column if not exists favorite_spot text;
