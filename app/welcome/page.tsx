import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AvatarUploader } from "@/components/AvatarUploader";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser, initials, isProfileComplete } from "@/lib/profile";

export const metadata: Metadata = { title: "Welcome | js_humorproject" };

/** Shown right after sign-in when first name or last name is still empty. */
export default async function WelcomePage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login");
  if (isProfileComplete(profile)) redirect("/lounge");

  return (
    <main className="page page-narrow">
      <section className="panel">
        <span className="sticker" aria-hidden="true">
          set up your profile
        </span>
        <h1 className="panel-title">First, what should we call you?</h1>
        <p className="panel-intro">
          You&apos;re signed in as <strong>{user.email}</strong>. Add a photo and your name. The rest is optional but helps the AI suggest spots you&apos;ll actually like.
        </p>

        {!profile && (
          <p className="notice notice-error" role="alert">
            We couldn&apos;t find your profile row. Make sure the profiles table and trigger have been created in
            Supabase.
          </p>
        )}

        <div className="welcome-avatar">
          <AvatarUploader userId={user.id} initialUrl={profile?.avatar_url ?? null} initials={initials(profile, user)} />
        </div>

        <ProfileForm
          from="welcome"
          defaults={{
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
            tagline: profile?.tagline ?? null,
            current_area: profile?.current_area ?? null,
            cities_visited: profile?.cities_visited ?? null,
            favorite_spot: profile?.favorite_spot ?? null,
          }}
          submitLabel="Finish setup →"
        />
      </section>
    </main>
  );
}
