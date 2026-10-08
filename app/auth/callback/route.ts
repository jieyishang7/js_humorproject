import { NextResponse, type NextRequest } from "next/server";
import { isProfileComplete } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/**
 * Google -> Supabase sends the user back here with a short-lived `code`.
 * We swap it for a session (stored in cookies), then decide where to go:
 * missing first/last name -> /welcome to fill them in, otherwise -> /lounge.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError || !code) {
    const message = oauthError ?? "Missing sign-in code.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("OAuth code exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Sign-in failed. Please try again.")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", data.user.id)
    .maybeSingle();

  const next = isProfileComplete(profile) ? "/lounge" : "/welcome";
  return NextResponse.redirect(`${origin}${next}`);
}
