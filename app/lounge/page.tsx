import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GenerateButton } from "@/components/GenerateButton";
import { MoodForm } from "@/components/MoodForm";
import { RequestCard } from "@/components/RequestCard";
import { getCaptions, getSavedIds, getSpotRequests } from "@/lib/captions";
import { getCurrentUser, isProfileComplete } from "@/lib/profile";
import { suggestAnotherSpot } from "./actions";

export const metadata: Metadata = { title: "Find a spot | Spot Finder NYC" };

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

  const [captions, requests, savedIds] = await Promise.all([getCaptions(user.id), getSpotRequests(), getSavedIds(user.id)]);
  const spots = captions.filter((c) => c.request_id !== null);
  const myVotes = spots.filter((c) => c.myVote !== 0).length;

  return (
    <main className="page">
      <section className="hero hero-compact">
        <p className="kicker">
          <span className="kicker-dot kicker-dot-green" aria-hidden="true" /> Spot Finder · members
        </p>
        <h1 className="hero-title">
          Hey, <span className="highlight">{profile?.first_name}</span>.
          <br />
          Where are you going today?
        </h1>
        <p className="hero-intro">Tell the AI your mood. It picks three NYC spots. Students like the picks that are actually good.</p>
      </section>

      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}

      <MoodForm />

      <ol className="steps" aria-label="How it works">
        <li>
          <span className="step-num">1</span>
          <div>
            <strong>Describe your mood</strong>
            <span>Budget, vibe, who you&apos;re with. Or tap an idea.</span>
          </div>
        </li>
        <li>
          <span className="step-num">2</span>
          <div>
            <strong>AI picks 3 spots</strong>
            <span>Real places, with the neighborhood and why it fits.</span>
          </div>
        </li>
        <li>
          <span className="step-num">3</span>
          <div>
            <strong>Like &amp; plan</strong>
            <span>❤️ the picks you love, ＋ add them to your plan.</span>
          </div>
        </li>
      </ol>

      <div className="lab-stats" aria-label="Activity">
        <span>
          <strong>{requests.length}</strong> moods
        </span>
        <span>
          <strong>{spots.length}</strong> AI picks
        </span>
        <span>
          <strong>{myVotes}</strong> liked by you
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="caption-empty">No requests yet. Be the first: tell the AI what you&apos;re in the mood for.</p>
      ) : (
        <ul className="lab-list">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              spots={spots.filter((c) => c.request_id === request.id)}
              signedIn
              savedIds={savedIds}
              footer={
                <form action={suggestAnotherSpot}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <GenerateButton label="✨ Suggest another spot" variant="secondary" />
                </form>
              }
            />
          ))}
        </ul>
      )}
    </main>
  );
}
