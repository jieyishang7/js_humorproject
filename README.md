# js_humorproject

A Next.js 16 app for The Humor Project course.

- **Assignment 2** – the homepage reads `public.jokes` from Supabase and shows it as a gallery.
- **Assignment 3** – Google sign-in through Supabase Auth, a `profiles` table filled by an `auth.users` trigger, a first-login name prompt, a Profile page (name, tagline, photo upload), and a members-only route.

## Routes

| Route | Who can see it | What it does |
| --- | --- | --- |
| `/` | everyone | Joke gallery. The banner changes depending on whether you're signed in (gated UI). |
| `/login` | signed-out visitors | "Continue with Google". Signed-in users are sent to `/lounge`. |
| `/auth/callback` | — | OAuth redirect target. Exchanges the code for a session, then goes to `/welcome` (name missing) or `/lounge`. |
| `/welcome` | signed in | Asks for first and last name if either is empty. |
| `/profile` | signed in | Edit first name, last name, tagline; upload a profile photo. |
| `/lounge` | signed in | "The Green Room": the protected, members-only page. |
| `/auth/signout` (POST) | signed in | Signs out and returns to `/`. |

Signed-out visitors who open `/lounge`, `/profile` or `/welcome` are redirected to `/login` by `proxy.ts` (Next.js 16's replacement for `middleware.ts`).

## How it fits together

- `lib/supabase/server.ts` / `client.ts` – Supabase clients from `@supabase/ssr`. The session lives in cookies, so server code knows who is signed in.
- `proxy.ts` – refreshes the session on every request and guards protected routes.
- `supabase/migrations/20261008_profiles_and_avatars.sql` – the `profiles` table, the `on_auth_user_created` trigger, row-level security for profiles, and the public `avatars` Storage bucket with per-user upload rules.
- Photos are uploaded straight to Storage under `avatars/<user id>/`. Only the public URL is saved in `profiles.avatar_url`; no image bytes go into the database. Uploading a new photo replaces the old one.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon key, never the service-role key).
3. Run `supabase/migrations/20261008_profiles_and_avatars.sql` in the Supabase SQL Editor.
4. Create a Google OAuth client (Web application) in Google Cloud Console with the authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then paste its Client ID and Secret into Supabase → Authentication → Sign In / Providers → Google.
5. In Supabase → Authentication → URL Configuration, allow these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://js-humorproject.vercel.app/auth/callback`
   - `https://js-humorproject-*-jie-yi.vercel.app/auth/callback` (commit-specific deployments)
6. `npm run dev` and open http://localhost:3000.

## Checks

```bash
npm run lint
npm run build
```
