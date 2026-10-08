import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser, isProfileComplete } from "@/lib/profile";

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
          step 1 of 1
        </span>
        <h1 className="panel-title">First, what should we call you?</h1>
        <p className="panel-intro">
          You&apos;re signed in as <strong>{user.email}</strong>. Add your name to finish setting up your profile. You can
          change it any time.
        </p>

        {!profile && (
          <p className="notice notice-error" role="alert">
            We couldn&apos;t find your profile row. Make sure the profiles table and trigger have been created in
            Supabase.
          </p>
        )}

        <ProfileForm
          from="welcome"
          defaults={{
            first_name: profile?.first_name ?? null,
            last_name: profile?.last_name ?? null,
            tagline: profile?.tagline ?? null,
          }}
          submitLabel="Finish setup →"
        />
      </section>
    </main>
  );
}
