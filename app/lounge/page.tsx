import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getJokes, type Joke } from "@/lib/jokes";
import { displayName, getCurrentUser, initials, isProfileComplete } from "@/lib/profile";

export const metadata: Metadata = { title: "The Green Room | js_humorproject" };

/**
 * Members-only route. proxy.ts already sends signed-out visitors to /login;
 * the check here is a second line of defence, and also makes sure the
 * user has filled in their name first.
 */
export default async function LoungePage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isProfileComplete(profile)) redirect("/welcome");

  let jokes: Joke[] = [];
  try {
    jokes = await getJokes();
  } catch {
    jokes = [];
  }

  // Same pick for everyone on a given day.
  const today = new Date();
  const dayNumber = Math.floor(today.getTime() / 86_400_000);
  const pick = jokes.length > 0 ? jokes[dayNumber % jokes.length] : null;
  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const badgeNumber = user.id.replace(/-/g, "").slice(0, 6).toUpperCase();

  return (
    <main className="page">
      <section className="hero hero-compact">
        <p className="kicker">
          <span className="kicker-dot kicker-dot-green" aria-hidden="true" /> The Green Room · members only
        </p>
        <h1 className="hero-title">
          Hey, <span className="highlight">{profile?.first_name}</span>.
        </h1>
        <p className="hero-intro">You made it backstage. Only signed-in members can see this page.</p>
      </section>

      <div className="lounge-grid">
        <article className="badge-card" aria-label="Your member badge">
          <div className="badge-top">
            <span>Humor Project</span>
            <span>Member</span>
          </div>
          <div className="avatar avatar-lg">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={displayName(profile, user)} fill unoptimized sizes="120px" />
            ) : (
              <span>{initials(profile, user)}</span>
            )}
          </div>
          <h2 className="badge-name">{displayName(profile, user)}</h2>
          <p className="badge-tagline">{profile?.tagline || "No tagline yet. Mysterious."}</p>
          <div className="badge-bottom">
            <span>No. {badgeNumber}</span>
            <Link href="/profile">Edit profile →</Link>
          </div>
          {!profile?.avatar_url && (
            <p className="badge-nudge">
              <Link href="/profile">Add a photo</Link> to finish your badge.
            </p>
          )}
        </article>

        <article className="panel pick-card">
          <p className="section-label">Pick of the day · {dateLabel}</p>
          {pick ? (
            <>
              <div className="joke-image joke-image-large">
                <Image src={pick.image_url} alt={pick.title} fill unoptimized sizes="(max-width: 900px) 100vw, 60vw" />
              </div>
              <h2 className="pick-title">{pick.title}</h2>
            </>
          ) : (
            <p className="notice">No jokes to pick from yet.</p>
          )}
        </article>
      </div>

      <section className="backstage">
        <h2 className="section-label">Backstage rules</h2>
        <ol className="rules">
          <li>
            <strong>Timing is everything.</strong> Especially when the assignment is due at 6 PM.
          </li>
          <li>
            <strong>Know your audience.</strong> Your TA is the audience.
          </li>
          <li>
            <strong>If it compiles, it&apos;s a feature.</strong> If it doesn&apos;t, it&apos;s a bit.
          </li>
        </ol>
      </section>
    </main>
  );
}
