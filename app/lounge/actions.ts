"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";

type GeminiModel = { name: string; supportedGenerationMethods?: string[] };

/**
 * Picks a model this API key can actually use. Google retires model names over
 * time, so instead of hard-coding one we ask the API for the current list and
 * take the newest general-purpose "flash" model. GEMINI_MODEL overrides this.
 */
async function pickModel(apiKey: string): Promise<string> {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;

  const response = await fetch(`${GEMINI_API}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey } });
  const body = (await response.json().catch(() => null)) as { models?: GeminiModel[] } | null;
  const usable = (body?.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => name.includes("flash") && !/(image|tts|audio|live|embedding|thinking|exp)/.test(name));

  const stable = usable.filter((name) => !name.includes("preview"));
  const candidates = (stable.length > 0 ? stable : usable).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );
  // Prefer the full flash model over the lighter "-lite" variant of the same version.
  return candidates.find((name) => !name.includes("lite")) ?? candidates[0] ?? "gemini-flash-latest";
}

function captionPrompt(title: string) {
  return [
    "You write captions for a college humor meme site.",
    "The audience is Sam: a Columbia College junior, chronically online, from the Midwest,",
    "new to New York City, lives in the dorms and explores the city on weekends.",
    `The image is titled "${title}".`,
    "Write ONE short, original caption (max 20 words) for this image that Sam would send to the group chat.",
    "Reply with the caption only: no quotes, no hashtags, no emojis.",
  ].join(" ");
}

/** Asks Gemini for a caption on a joke image and saves it with its prompt. */
export async function generateCaption(formData: FormData) {
  const jokeId = Number(formData.get("joke_id"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The Vercel project stores the key as `geminiapikey`; GEMINI_API_KEY also works locally.
  const apiKey = process.env.GEMINI_API_KEY || process.env.geminiapikey;
  if (!apiKey) redirect("/lounge?error=AI+generation+is+not+configured+yet+(missing+GEMINI_API_KEY).");

  const { data: joke } = await supabase.from("jokes").select("id, title, image_url").eq("id", jokeId).maybeSingle();
  if (!joke) redirect("/lounge?error=That+image+no+longer+exists.");

  const prompt = captionPrompt(joke.title);
  const parts: object[] = [{ text: prompt }];
  try {
    const image = await fetch(joke.image_url);
    if (image.ok) {
      const bytes = Buffer.from(await image.arrayBuffer()).toString("base64");
      parts.push({ inline_data: { mime_type: image.headers.get("content-type") ?? "image/jpeg", data: bytes } });
    }
  } catch {
    // Fall back to captioning from the title alone.
  }

  const model = await pickModel(apiKey);
  const response = await fetch(`${GEMINI_API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  const result = await response.json().catch(() => null);
  const content: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!response.ok || !content) {
    console.error("Gemini request failed:", model, response.status, result?.error?.message);
    redirect("/lounge?error=The+AI+didn't+answer.+Try+again+in+a+moment.");
  }

  const { error } = await supabase
    .from("captions")
    .insert({ joke_id: joke.id, author_id: user.id, prompt, model, content: content.slice(0, 300) });
  if (error) {
    console.error("Saving caption failed:", error.message);
    redirect("/lounge?error=Couldn't+save+the+caption.");
  }

  revalidatePath("/lounge");
  redirect(`/lounge#joke-${joke.id}`);
}

/** Records the signed-in user's vote (+1 / -1). Voting the same way twice removes the vote. */
export async function vote(formData: FormData) {
  const captionId = Number(formData.get("caption_id"));
  const value = Number(formData.get("value"));
  if (!Number.isInteger(captionId) || (value !== 1 && value !== -1)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("caption_votes")
    .select("value")
    .eq("caption_id", captionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.value === value) {
    await supabase.from("caption_votes").delete().eq("caption_id", captionId).eq("user_id", user.id);
  } else if (existing) {
    await supabase.from("caption_votes").update({ value }).eq("caption_id", captionId).eq("user_id", user.id);
  } else {
    const { error } = await supabase.from("caption_votes").insert({ caption_id: captionId, user_id: user.id, value });
    if (error) console.error("Vote failed:", error.message);
  }

  revalidatePath("/lounge");
}
