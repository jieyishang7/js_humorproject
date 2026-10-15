"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"first_name" | "last_name" | "tagline" | "current_area" | "cities_visited" | "favorite_spot", string>>;
};

const MAX_NAME = 50;
const MAX_TAGLINE = 120;
const MAX_AREA = 80;
const MAX_CITIES = 200;
const MAX_SPOT = 120;

function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Saves the signed-in user's profile details. */
export async function saveProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const firstName = clean(formData.get("first_name"));
  const lastName = clean(formData.get("last_name"));
  const tagline = clean(formData.get("tagline"));
  const currentArea = clean(formData.get("current_area"));
  const citiesVisited = clean(formData.get("cities_visited"));
  const favoriteSpot = clean(formData.get("favorite_spot"));
  const from = clean(formData.get("from"));

  const fieldErrors: ProfileFormState["fieldErrors"] = {};
  if (!firstName) fieldErrors.first_name = "Please add your first name.";
  else if (firstName.length > MAX_NAME) fieldErrors.first_name = `Keep it under ${MAX_NAME} characters.`;
  if (!lastName) fieldErrors.last_name = "Please add your last name.";
  else if (lastName.length > MAX_NAME) fieldErrors.last_name = `Keep it under ${MAX_NAME} characters.`;
  if (tagline.length > MAX_TAGLINE) fieldErrors.tagline = `Keep it under ${MAX_TAGLINE} characters.`;
  if (currentArea.length > MAX_AREA) fieldErrors.current_area = `Keep it under ${MAX_AREA} characters.`;
  if (citiesVisited.length > MAX_CITIES) fieldErrors.cities_visited = `Keep it under ${MAX_CITIES} characters.`;
  if (favoriteSpot.length > MAX_SPOT) fieldErrors.favorite_spot = `Keep it under ${MAX_SPOT} characters.`;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "A couple of things need fixing.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      tagline: tagline || null,
      current_area: currentArea || null,
      cities_visited: citiesVisited || null,
      favorite_spot: favoriteSpot || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Profile update failed:", error.message);
    return { status: "error", message: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/", "layout");

  // First-time setup goes straight into the members-only page.
  if (from === "welcome") redirect("/lounge");

  return { status: "saved", message: "Saved. Looking good." };
}

/**
 * Called after the browser uploads a photo to the `avatars` bucket.
 * Only the public URL is stored in the database, never the image itself.
 */
export async function saveAvatar(path: string): Promise<{ ok: boolean; message?: string; url?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You're signed out. Please sign in again." };

  // The file must sit in this user's own folder: avatars/<user id>/...
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) {
    return { ok: false, message: "That upload doesn't belong to you." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Avatar URL update failed:", error.message);
    return { ok: false, message: "Photo uploaded, but saving it to your profile failed." };
  }

  revalidatePath("/", "layout");
  return { ok: true, url: publicUrl };
}
