# js_humorproject

Assignment 2 extends the original Next.js Hello World app into a responsive joke gallery. The homepage reads `id`, `title`, `image_url`, and `created_at` from Supabase's `public.jokes` table, ordered by `id` ascending. There is no authentication or local sample data.

## Local setup

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill both values from your Supabase project's Connect dialog or API settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: your project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: your project's legacy anon key. Never use a service-role or secret key here.
3. Run `npm run dev` and open http://localhost:3000.

`.env.local` is ignored by Git. Restart the dev server after changing environment variables.

## Checks

```bash
npm run lint
npm run build
```

For a local production preview, stop the dev server, then run `npm start` after building.

## Verify the live data

- Compare the cards with the rows in Supabase's Table Editor (`public.jokes`). Cards follow ascending IDs.
- Optionally change a title in Supabase, refresh the homepage, and restore the original title afterward. No code edit or rebuild is needed.
- `app/page.tsx` is a Server Component: database requests run in the Next.js server, so they will not appear as Supabase requests in browser DevTools. Images are fetched directly from their public Storage URLs.
- `lib/supabase.ts` performs the actual `.from("jokes").select(...).order("id", { ascending: true })` query with caching disabled. The page uses `connection()` to fetch at request time.
- Missing configuration, query errors, and an empty table have separate messages. No hardcoded fallback jokes are displayed.

The table must allow `anon` to SELECT through grants and RLS. Public visitors do not need write access. Images must be publicly readable.

## Future Vercel deployment

Set the same two environment variables in the existing Vercel project before redeploying. Local `.env.local` is not uploaded through Git. This integration has not been committed, pushed, or deployed.
