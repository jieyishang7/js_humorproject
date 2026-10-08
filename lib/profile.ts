import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  tagline: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export const PROFILE_COLUMNS = "id, email, first_name, last_name, tagline, avatar_url, created_at, updated_at";

export function isProfileComplete(profile: Pick<Profile, "first_name" | "last_name"> | null): boolean {
  return Boolean(profile?.first_name?.trim() && profile?.last_name?.trim());
}

export function displayName(profile: Profile | null, user?: User | null): string {
  const full = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  return full || user?.email?.split("@")[0] || "friend";
}

export function initials(profile: Profile | null, user?: User | null): string {
  const first = profile?.first_name?.trim()?.[0];
  const last = profile?.last_name?.trim()?.[0];
  if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase();
  return (user?.email?.[0] ?? "?").toUpperCase();
}

/**
 * Returns the signed-in user and their row in public.profiles.
 * `profile` is null if the user is signed out or the trigger has not run.
 * Wrapped in cache() so the header and the page share one lookup per request.
 */
export const getCurrentUser = cache(async (): Promise<{ user: User | null; profile: Profile | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error) console.error("Could not load profile:", error.message);

  return { user, profile: profile ?? null };
});
