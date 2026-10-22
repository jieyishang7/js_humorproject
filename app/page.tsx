import Link from "next/link";
import { connection } from "next/server";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { MoodForm } from "@/components/MoodForm";
import { RequestCard } from "@/components/RequestCard";
import { getCaptions, getSavedIds, getSpotRequests } from "@/lib/captions";
import { displayName, getCurrentUser } from "@/lib/profile";

export default async function Home() {
  // Read Supabase on every request, rather than freezing the page at build time.
  await connection();

  let session: Awaited<ReturnType<typeof getCurrentUser>> = { user: null, profile: null };
  try {
    session = await getCurrentUser();
  } catch {
    // Missing configuration: the sections below show their empty states.
  }
  const { user, profile } = session;
  const signedIn = Boolean(user);

  // AI picks and votes are members-only: signed-out visitors don't load them at all.
  const [captions, requests, savedIds] = user
    ? await Promise.all([getCaptions(user.id), getSpotRequests(6), getSavedIds(user.id)])
    : [[], [], new Set<number>()];
  const spots = captions.filter((c) => c.request_id !== null);

  return (
    <main className="page">
      <section className="hero" aria-labelledby="home-title">
        <p className="kicker">
          <span className="kicker-dot" aria-hidden="true" /> Spot Finder NYC
        </p>
        <h1 id="home-title" className="hero-title">
          Where should
          <br />
          <span className="highlight">you go today?</span>
        </h1>
        <p className="hero-intro">
          Tell the AI your mood. It picks three New York spots. Students like the picks that are actually worth the
          subway ride.
        </p>
        <ul className="area-tiles" aria-label="Popular areas">
          {[
            ["🗽", "Midtown"],
            ["🌳", "Central Park"],
            ["📚", "Morningside"],
            ["🎨", "Chelsea"],
            ["🍜", "East Village"],
            ["🌉", "Brooklyn"],
          ].map(([icon, name]) => (
            <li key={name}>
              <Link href={signedIn ? "/lounge" : "/login"} className="area-tile">
                <span className="area-icon" aria-hidden="true">
                  {icon}
                </span>
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Gated UI: signed-in members ask right here; visitors are invited to sign in. */}
      {signedIn ? (
        <>
          <p className="gate-hello">
            Hi <strong>{displayName(profile, user)}</strong>, what are we doing today?
          </p>
          <MoodForm />
        </>
      ) : (
        <aside className="gate gate-locked">
          <div>
            <p className="gate-label">Members only</p>
            <p className="gate-text">Sign in to ask the AI for spots, see everyone&apos;s picks, and like your favorites.</p>
          </div>
          <GoogleSignInButton label="Sign in with Google" />
        </aside>
      )}

      {signedIn && (
      <section aria-labelledby="latest-title" className="latest">
        <div className="latest-head">
          <h2 id="latest-title" className="section-title">
            Latest picks
          </h2>
          {signedIn && requests.length > 0 && (
            <Link href="/lounge" className="card-captions-link">
              See all →
            </Link>
          )}
        </div>

        {requests.length === 0 ? (
          <p className="caption-empty">
            {signedIn ? "No picks yet. Ask the AI above to get things started." : "Sign in to see what students are asking the AI."}
          </p>
        ) : (
          <ul className="request-grid">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                spots={spots.filter((c) => c.request_id === request.id)}
                signedIn={signedIn}
                visible={3}
                savedIds={savedIds}
              />
            ))}
          </ul>
        )}
      </section>
      )}
    </main>
  );
}
