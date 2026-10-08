import { createClient } from "@/lib/supabase/server";

export type Joke = {
  id: number;
  title: string;
  image_url: string;
  created_at: string | null;
};

export async function getJokes(): Promise<Joke[]> {
  const supabase = await createClient();

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
