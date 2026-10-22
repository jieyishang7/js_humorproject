-- Week 6: AI picks and votes are members-only again (like Assignment 4).
-- Signed-out visitors can no longer read spot requests, captions or votes.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to run again.
drop policy if exists "Anyone can read spot requests" on public.spot_requests;
create policy "Members can read spot requests" on public.spot_requests
  for select to authenticated using (true);
revoke select on public.spot_requests from anon;

drop policy if exists "Anyone can read captions" on public.captions;
revoke select on public.captions from anon;

drop policy if exists "Anyone can read vote totals" on public.caption_votes;
revoke select on public.caption_votes from anon;
