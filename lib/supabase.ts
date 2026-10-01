import { createClient } from "@supabase/supabase-js";

export type Joke = {
  id: number;
  title: string;
  image_url: string;
  created_at: string | null;
};

export async function getJokes(): Promise<Joke[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart Next.js.");
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });

  const { data, error } = await supabase
    .from("jokes")
    .select("id, title, image_url, created_at")
    .order("id", { ascending: true });

  if (error) {
    console.error("Supabase jokes query failed:", error.message);
    throw new Error("Could not load jokes. Check your Supabase connection and table read permissions, then refresh.");
  }

  return data;
}
