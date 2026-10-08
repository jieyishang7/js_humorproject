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
  // The Vercel project stores the key as `geminiapikey`; GEMINI_API_KEY also works locally.
  const apiKey = process.env.GEMINI_API_KEY || process.env.geminiapikey;
  if (!apiKey) redirect("/lounge?error=AI+generation+is+not+configured+yet+(missing+Gemini+API+key).");

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

  for (const model of await candidateModels(apiKey)) {
    const response = await fetch(`${GEMINI_API}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    const result = await response.json().catch(() => null);
    const content: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (response.ok && content) return { content: content.slice(0, 300), model };

    console.error("Gemini request failed:", model, response.status, result?.error?.message);
    if (response.status !== 404 && response.status !== 429) break;
  }
  return null;
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

  revalidatePath("/lounge");
}
