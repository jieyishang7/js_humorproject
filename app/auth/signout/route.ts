import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 turns the POST into a normal GET of the homepage.
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
