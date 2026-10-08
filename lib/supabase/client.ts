import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components (runs in the browser). */
export function createClient() {
  // NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
