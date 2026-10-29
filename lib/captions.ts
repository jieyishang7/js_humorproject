import { createClient } from "@/lib/supabase/server";

export type Caption = {
  id: number;
  joke_id: number | null;
  upload_id: number | null;
  request_id: number | null;
  content: string;
  created_at: string;
  score: number;
  myVote: -1 | 0 | 1;
  imageUrl: string | null;
};

export type Upload = { id: number; image_url: string; created_at: string };

/**
 * All captions with their vote totals and the current user's own vote, best first
 * (ties: newest first). Pass null for signed-out visitors. Returns [] if the
 * database refuses (e.g. signed-out visitors without read access).
 */
export async function getCaptions(userId: string | null): Promise<Caption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("captions")
    .select("id, joke_id, upload_id, request_id, content, created_at, caption_votes(value, user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load captions:", error.message);
    return [];
  }

  // AI pictures of recommended spots (newest per spot). Optional: ignored if the table is missing.
  const images = new Map<number, string>();
  const { data: imageRows } = await supabase
    .from("spot_images")
    .select("caption_id, image_url")
    .order("created_datetime_utc", { ascending: true });
  for (const img of (imageRows ?? []) as { caption_id: number; image_url: string }[]) images.set(img.caption_id, img.image_url);

  return data
    .map((row) => {
      const votes = (row.caption_votes ?? []) as { value: number; user_id: string }[];
      const mine = userId ? (votes.find((v) => v.user_id === userId)?.value ?? 0) : 0;
      return {
        id: row.id,
        joke_id: row.joke_id,
        upload_id: row.upload_id,
        request_id: row.request_id,
        content: row.content,
        created_at: row.created_at,
        score: votes.reduce((sum, v) => sum + v.value, 0),
        myVote: mine as Caption["myVote"],
        imageUrl: images.get(row.id) ?? null,
      };
    })
    .sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at));
}

/** Photos members have uploaded, newest first. */
export async function getUploads(): Promise<Upload[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Could not load uploads:", error.message);
    return [];
  }
  return data;
}

export type SpotRequest = { id: number; mood: string; created_at: string };

/** Recent "what are you in the mood for?" requests, newest first. */
export async function getSpotRequests(limit = 30): Promise<SpotRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spot_requests")
    .select("id, mood, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Could not load spot requests:", error.message);
    return [];
  }
  return data;
}

export type Spot = { name: string; area: string; why: string; price?: string };

/** A recommendation is stored as JSON in captions.content; older captions are plain text. */
export function parseSpot(content: string): Spot | null {
  try {
    const spot = JSON.parse(content);
    return spot && typeof spot.name === "string" ? spot : null;
  } catch {
    return null;
  }
}

/** Caption ids the user has added to their plan. Empty if signed out or the table is missing. */
export async function getSavedIds(userId: string | null): Promise<Set<number>> {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase.from("saved_spots").select("caption_id").eq("user_id", userId);
  if (error) {
    console.error("Could not load plan:", error.message);
    return new Set();
  }
  return new Set(data.map((row) => row.caption_id as number));
}

export type PlanItem = { caption_id: number; created_at: string; content: string; mood: string | null };

/** The user's saved spots, newest first, with the mood they came from. */
export async function getPlan(userId: string): Promise<PlanItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_spots")
    .select("caption_id, created_at, captions(content, spot_requests(mood))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load plan:", error.message);
    return [];
  }
  return data.map((row) => {
    const caption = (Array.isArray(row.captions) ? row.captions[0] : row.captions) as
      | { content: string; spot_requests: { mood: string } | { mood: string }[] | null }
      | null;
    const request = Array.isArray(caption?.spot_requests) ? caption?.spot_requests[0] : caption?.spot_requests;
    return { caption_id: row.caption_id, created_at: row.created_at, content: caption?.content ?? "", mood: request?.mood ?? null };
  });
}
