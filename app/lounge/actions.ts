"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
// The model Google's own error message recommends for new API keys.
const PREFERRED_MODEL = "gemini-3.8-flash";

type GeminiModel = { name: string; supportedGenerationMethods?: string[] };

/**
 * Models to try, best first. Google retires model names and some models have
 * no free-tier quota, so besides the preferred model we ask the API which
 * general-purpose "flash" models this key can call. GEMINI_MODEL overrides all.
 */
async function candidateModels(apiKey: string): Promise<string[]> {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];

  const response = await fetch(`${GEMINI_API}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey } });
  const body = (await response.json().catch(() => null)) as { models?: GeminiModel[] } | null;
  const listed = (body?.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => name.includes("flash") && !/(omni|image|tts|audio|live|embedding|thinking|exp)/.test(name))
    .sort((a, b) => {
      // Stable before preview, full before lite, then newest version first.
      const rank = (n: string) => (n.includes("preview") ? 2 : 0) + (n.includes("lite") ? 1 : 0);
      return rank(a) - rank(b) || b.localeCompare(a, undefined, { numeric: true });
    });

  return [...new Set([PREFERRED_MODEL, ...listed, "gemini-flash-latest"])].slice(0, 5);
}

function captionPrompt(subject: string) {
  return [
    "You write captions for a college humor meme site.",
    "The audience is Sam: a Columbia College junior, chronically online, from the Midwest,",
    "new to New York City, lives in the dorms and explores the city on weekends.",
    subject,
    "Write ONE short, original caption (max 20 words) for this image that Sam would send to the group chat.",
    "Reply with the caption only: no quotes, no hashtags, no emojis.",
  ].join(" ");
}

/**
 * Sends the image and prompt to Gemini, trying the next model when one is
 * retired (404) or has no quota (429). Returns the caption and the model used.
 */
async function writeCaption(prompt: string, imageUrl: string): Promise<{ content: string; model: string } | null> {
  const apiKey = geminiKey();

  const parts: object[] = [{ text: prompt }];
  try {
    const image = await fetch(imageUrl);
    if (image.ok) {
      const bytes = Buffer.from(await image.arrayBuffer()).toString("base64");
      parts.push({ inline_data: { mime_type: image.headers.get("content-type") ?? "image/jpeg", data: bytes } });
    }
  } catch {
    // Fall back to captioning from the text alone.
  }

  const answer = await askGemini(apiKey, parts);
  return answer ? { content: answer.text.slice(0, 300), model: answer.model } : null;
}

/**
 * Calls Gemini, trying the next model when one is retired (404) or has no
 * quota (429). With `json`, asks for a JSON-only reply.
 */
async function askGemini(apiKey: string, parts: object[], json = false): Promise<{ text: string; model: string } | null> {
  for (const model of await candidateModels(apiKey)) {
    const response = await fetch(`${GEMINI_API}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        ...(json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
      }),
    });
    const result = await response.json().catch(() => null);
    const text: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (response.ok && text) return { text, model };

    console.error("Gemini request failed:", model, response.status, result?.error?.message);
    if (response.status !== 404 && response.status !== 429) break;
  }
  return null;
}

function geminiKey(): string {
  // The Vercel project stores the key as `geminiapikey`; GEMINI_API_KEY also works locally.
  const apiKey = process.env.GEMINI_API_KEY || process.env.geminiapikey;
  if (!apiKey) redirect("/lounge?error=AI+generation+is+not+configured+yet+(missing+Gemini+API+key).");
  return apiKey;
}

/* ------------------------------------------------------------------ */
/* Spot Finder NYC: mood in, AI place recommendations out, members vote. */
/* ------------------------------------------------------------------ */

type Spot = { name: string; area: string; why: string; price?: string };

type About = { current_area: string | null; favorite_spot: string | null } | null;

function spotPrompt(mood: string, count: number, avoid: string[], about: About = null) {
  return [
    "You recommend real places in New York City to Columbia University students.",
    "Many are new to the city, live near Morningside Heights, travel by subway and are on a student budget.",
    `A student says what they're in the mood for: "${mood}".`,
    about?.current_area && about.current_area !== "Not in NYC right now"
      ? `They are based in ${about.current_area}; prefer places that are easy to reach from there.`
      : "",
    about?.favorite_spot ? `Their favorite hangout is ${about.favorite_spot}, so they may like places with a similar feel.` : "",
    `Recommend ${count} specific, real, currently operating places (cafes, parks, museums, bookstores, food spots, viewpoints, etc.) that fit.`,
    "Mix well-known and lesser-known picks, and spread them across neighborhoods when it makes sense.",
    avoid.length ? `Do not repeat any of these: ${avoid.join("; ")}.` : "",
    'Reply with JSON only: an array of objects with keys "name" (place name), "area" (neighborhood),',
    '"why" (one punchy sentence, max 25 words, on why it fits this mood) and "price" (one of "Free", "$", "$$", "$$$").',
  ].join(" ");
}

function parseSpots(text: string): Spot[] {
  try {
    const data = JSON.parse(text.replace(/^```(?:json)?|```$/g, "").trim());
    const list = Array.isArray(data) ? data : [data];
    return list
      .filter((s) => s && typeof s.name === "string" && typeof s.why === "string")
      .map((s) => ({
        name: String(s.name).slice(0, 80),
        area: String(s.area ?? "").slice(0, 60),
        why: String(s.why).slice(0, 220),
        price: typeof s.price === "string" ? s.price.slice(0, 6) : undefined,
      }));
  } catch {
    return [];
  }
}

async function recommendSpots(mood: string, count: number, avoid: string[], about: About = null) {
  const prompt = spotPrompt(mood, count, avoid, about);
  const answer = await askGemini(geminiKey(), [{ text: prompt }], true);
  if (!answer) return null;
  return { spots: parseSpots(answer.text).slice(0, count), model: answer.model, prompt };
}

/** The signed-in user's location and favorite spot, if they filled them in. */
async function getAbout(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<About> {
  const { data, error } = await supabase
    .from("profiles")
    .select("current_area, favorite_spot")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null; // e.g. columns not added yet
  return data;
}

/** Saves a mood, asks the AI for 3 places, and stores each one so it can be voted on. */
export async function createSpotRequest(formData: FormData) {
  const mood = String(formData.get("mood") ?? "").trim().replace(/\s+/g, " ");
  if (mood.length < 3) redirect("/lounge?error=Tell+us+a+little+more+about+your+mood+(at+least+3+characters).");
  if (mood.length > 200) redirect("/lounge?error=Keep+it+under+200+characters.");

  const { supabase, user } = await requireUser();

  const result = await recommendSpots(mood, 3, [], await getAbout(supabase, user.id));
  if (!result || result.spots.length === 0) redirect("/lounge?error=The+AI+didn't+answer.+Try+again+in+a+moment.");

  const { data: request, error } = await supabase
    .from("spot_requests")
    .insert({ author_id: user.id, mood })
    .select("id")
    .single();
  if (error || !request) {
    console.error("Saving spot request failed:", error?.message);
    redirect("/lounge?error=Couldn't+save+your+request.");
  }

  const { error: spotsError } = await supabase.from("captions").insert(
    result.spots.map((spot) => ({
      request_id: request.id,
      author_id: user.id,
      prompt: result.prompt,
      model: result.model,
      content: JSON.stringify(spot),
    })),
  );
  if (spotsError) console.error("Saving spots failed:", spotsError.message);

  revalidatePath("/");
  revalidatePath("/lounge");
  redirect(`/lounge#request-${request.id}`);
}

/** Asks the AI for one more place for an existing mood, avoiding places already suggested. */
export async function suggestAnotherSpot(formData: FormData) {
  const requestId = Number(formData.get("request_id"));
  const { supabase, user } = await requireUser();

  const { data: request } = await supabase.from("spot_requests").select("id, mood").eq("id", requestId).maybeSingle();
  if (!request) redirect("/lounge?error=That+request+no+longer+exists.");

  const { data: existing } = await supabase.from("captions").select("content").eq("request_id", request.id);
  const avoid = (existing ?? []).flatMap((row) => parseSpots(row.content).map((s) => s.name));

  const result = await recommendSpots(request.mood, 1, avoid, await getAbout(supabase, user.id));
  if (!result || result.spots.length === 0) redirect("/lounge?error=The+AI+didn't+answer.+Try+again+in+a+moment.");

  await supabase.from("captions").insert({
    request_id: request.id,
    author_id: user.id,
    prompt: result.prompt,
    model: result.model,
    content: JSON.stringify(result.spots[0]),
  });

  revalidatePath("/");
  revalidatePath("/lounge");
  redirect(`/lounge#request-${request.id}`);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Asks the AI for a caption on a gallery joke and saves it with its prompt. */
export async function generateCaption(formData: FormData) {
  const jokeId = Number(formData.get("joke_id"));
  const { supabase, user } = await requireUser();

  const { data: joke } = await supabase.from("jokes").select("id, title, image_url").eq("id", jokeId).maybeSingle();
  if (!joke) redirect("/lounge?error=That+image+no+longer+exists.");

  const prompt = captionPrompt(`The image is titled "${joke.title}".`);
  const caption = await writeCaption(prompt, joke.image_url);
  if (!caption) redirect("/lounge?error=The+AI+didn't+answer.+Try+again+in+a+moment.");

  const { error } = await supabase
    .from("captions")
    .insert({ joke_id: joke.id, author_id: user.id, prompt, model: caption.model, content: caption.content });
  if (error) {
    console.error("Saving caption failed:", error.message);
    redirect("/lounge?error=Couldn't+save+the+caption.");
  }

  revalidatePath("/");
  revalidatePath("/lounge");
  redirect(`/lounge#joke-${joke.id}`);
}

/**
 * Called after the browser uploads a photo to the `uploads` bucket: records the
 * upload (URL only, never the image bytes) and has the AI caption it.
 */
export async function captionUpload(path: string): Promise<{ ok: boolean; message?: string }> {
  const { supabase, user } = await requireUser();
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) {
    return { ok: false, message: "That upload doesn't belong to you." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("uploads").getPublicUrl(path);

  const { data: upload, error: uploadError } = await supabase
    .from("uploads")
    .insert({ owner_id: user.id, image_url: publicUrl })
    .select("id")
    .single();
  if (uploadError || !upload) {
    console.error("Saving upload failed:", uploadError?.message);
    return { ok: false, message: "Photo uploaded, but saving it failed." };
  }

  const prompt = captionPrompt("This is a photo a student just uploaded.");
  const caption = await writeCaption(prompt, publicUrl);
  if (caption) {
    const { error } = await supabase
      .from("captions")
      .insert({ upload_id: upload.id, author_id: user.id, prompt, model: caption.model, content: caption.content });
    if (error) console.error("Saving caption failed:", error.message);
  }

  revalidatePath("/");
  revalidatePath("/lounge");
  return caption
    ? { ok: true }
    : { ok: false, message: "Photo saved, but the AI didn't answer. Try “Generate another caption” in a moment." };
}

/** Asks the AI for another caption on an uploaded photo. */
export async function generateUploadCaption(formData: FormData) {
  const uploadId = Number(formData.get("upload_id"));
  const { supabase, user } = await requireUser();

  const { data: upload } = await supabase.from("uploads").select("id, image_url").eq("id", uploadId).maybeSingle();
  if (!upload) redirect("/lounge?error=That+photo+no+longer+exists.");

  const prompt = captionPrompt("This is a photo a student just uploaded.");
  const caption = await writeCaption(prompt, upload.image_url);
  if (!caption) redirect("/lounge?error=The+AI+didn't+answer.+Try+again+in+a+moment.");

  await supabase
    .from("captions")
    .insert({ upload_id: upload.id, author_id: user.id, prompt, model: caption.model, content: caption.content });

  revalidatePath("/");
  revalidatePath("/lounge");
  redirect(`/lounge#upload-${upload.id}`);
}

/** Records the signed-in user's vote (+1 / -1). Voting the same way twice removes the vote. */
export async function vote(formData: FormData) {
  const captionId = Number(formData.get("caption_id"));
  const value = Number(formData.get("value"));
  if (!Number.isInteger(captionId) || (value !== 1 && value !== -1)) return;

  const { supabase, user } = await requireUser();

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

  // Votes show on both the homepage and the members page.
  revalidatePath("/");
  revalidatePath("/lounge");
}

/** Adds a recommended spot to the signed-in user's plan, or removes it if it's already there. */
export async function togglePlan(captionId: number, save: boolean) {
  if (!Number.isInteger(captionId)) return;
  const { supabase, user } = await requireUser();

  if (save) {
    // Plain insert (no upsert: that would need UPDATE rights). Already saved = fine.
    const { error } = await supabase.from("saved_spots").insert({ user_id: user.id, caption_id: captionId });
    if (error && error.code !== "23505") console.error("Saving to plan failed:", error.message);
  } else {
    await supabase.from("saved_spots").delete().eq("user_id", user.id).eq("caption_id", captionId);
  }

  revalidatePath("/");
  revalidatePath("/lounge");
  revalidatePath("/plan");
}
