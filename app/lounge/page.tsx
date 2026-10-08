import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PhotoUploader } from "@/components/PhotoUploader";
import { getCaptions, getUploads, type Caption } from "@/lib/captions";
import { getJokes, type Joke } from "@/lib/jokes";
import { generateCaption, generateUploadCaption, vote } from "./actions";
import { displayName, getCurrentUser, initials, isProfileComplete } from "@/lib/profile";

export const metadata: Metadata = { title: "The Green Room | js_humorproject" };

/**
 * Members-only route. proxy.ts already sends signed-out visitors to /login;
 * the check here is a second line of defence, and also makes sure the
 * user has filled in their name first.
 */
export default async function LoungePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isProfileComplete(profile)) redirect("/welcome");

  let jokes: Joke[] = [];
  try {
    jokes = await getJokes();
  } catch {
    jokes = [];
  }

  const [captions, uploads] = await Promise.all([getCaptions(user.id), getUploads()]);

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

      <section className="backstage caption-lab" aria-labelledby="lab-title">
        <h2 id="lab-title" className="section-label">Caption Lab · AI writes, you judge</h2>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <PhotoUploader userId={user.id} />
        <ul className="lab-list">
          {uploads.map((upload) => (
            <li key={`upload-${upload.id}`} id={`upload-${upload.id}`} className="panel lab-item">
              <div className="joke-image">
                <Image src={upload.image_url} alt="A member's uploaded photo" fill unoptimized sizes="(max-width: 900px) 100vw, 40vw" />
              </div>
              <div className="lab-body">
                <h3 className="pick-title">Member upload</h3>
                <form action={generateUploadCaption}>
                  <input type="hidden" name="upload_id" value={upload.id} />
                  <button type="submit" className="btn btn-secondary btn-small">
                    ✨ Generate another caption
                  </button>
                </form>
                <CaptionList captions={captions.filter((c) => c.upload_id === upload.id)} />
              </div>
            </li>
          ))}
          {jokes.map((joke) => (
            <li key={joke.id} id={`joke-${joke.id}`} className="panel lab-item">
              <div className="joke-image">
                <Image src={joke.image_url} alt={joke.title} fill unoptimized sizes="(max-width: 900px) 100vw, 40vw" />
              </div>
              <div className="lab-body">
                <h3 className="pick-title">{joke.title}</h3>
                <form action={generateCaption}>
                  <input type="hidden" name="joke_id" value={joke.id} />
                  <button type="submit" className="btn btn-primary btn-small">
                    ✨ Generate an AI caption
                  </button>
                </form>
                <CaptionList captions={captions.filter((c) => c.joke_id === joke.id)} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

/** AI captions for one image, best first, each with upvote/downvote buttons. */
function CaptionList({ captions }: { captions: Caption[] }) {
  if (captions.length === 0) return <p className="hint">No captions yet. Be the first.</p>;

  return (
    <ol className="caption-list">
      {captions.map((caption) => (
        <li key={caption.id} className="caption-row">
          <form action={vote} className="vote-box">
            <input type="hidden" name="caption_id" value={caption.id} />
            <button type="submit" name="value" value="1" className="vote-btn" data-active={caption.myVote === 1} aria-label="Upvote">
              ▲
            </button>
            <span className="vote-score">{caption.score}</span>
            <button type="submit" name="value" value="-1" className="vote-btn" data-active={caption.myVote === -1} aria-label="Downvote">
              ▼
            </button>
          </form>
          <p className="caption-text">{caption.content}</p>
        </li>
      ))}
    </ol>
  );
}
