import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AvatarUploader } from "@/components/AvatarUploader";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser, initials } from "@/lib/profile";

export const metadata: Metadata = { title: "Your profile | js_humorproject" };

export default async function ProfilePage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login");

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <main className="page page-narrow">
      <section className="panel">
        <span className="sticker" aria-hidden="true">
          your profile
        </span>
        <h1 className="panel-title">Profile</h1>
        <p className="panel-intro">
          {user.email}
          {memberSince && <> · member since {memberSince}</>}
        </p>

        <div className="panel-section">
          <h2 className="section-label">Photo</h2>
          <AvatarUploader userId={user.id} initialUrl={profile?.avatar_url ?? null} initials={initials(profile, user)} />
        </div>

        <div className="panel-section">
          <h2 className="section-label">Details</h2>
          <ProfileForm
            from="profile"
            defaults={{
              first_name: profile?.first_name ?? null,
              last_name: profile?.last_name ?? null,
              tagline: profile?.tagline ?? null,
            }}
            submitLabel="Save changes"
          />
        </div>
      </section>
    </main>
  );
}
