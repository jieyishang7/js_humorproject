import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { getJokes, type Joke } from "@/lib/jokes";
import { displayName, getCurrentUser } from "@/lib/profile";

export default async function Home() {
  // Read Supabase on every request, rather than freezing the list at build time.
  await connection();

  let jokes: Joke[] = [];
  let errorMessage: string | null = null;
  try {
    jokes = await getJokes();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Could not load jokes. Please refresh and try again.";
  }

  let session: Awaited<ReturnType<typeof getCurrentUser>> = { user: null, profile: null };
  try {
    session = await getCurrentUser();
  } catch {
    // Configuration problems are already reported through errorMessage.
  }
  const { user, profile } = session;

  return (
    <main className="page">
      <section className="hero" aria-labelledby="gallery-title">
        <p className="kicker">
          <span className="kicker-dot" aria-hidden="true" /> The Humor Project
        </p>
        <h1 id="gallery-title" className="hero-title">
          <span className="highlight">A little humor.</span>
        </h1>
        <p className="hero-intro">For the moments every student knows a little too well.</p>
      </section>

      {/* Gated UI: the same spot shows different things to signed-in and signed-out visitors. */}
      {user ? (
        <aside className="gate gate-open">
          <div>
            <p className="gate-label">You&apos;re in</p>
            <p className="gate-text">
              Welcome back, <strong>{displayName(profile, user)}</strong>. The Green Room is open.
            </p>
          </div>
          <Link href="/lounge" className="btn btn-primary">
            Enter the Green Room →
          </Link>
        </aside>
      ) : (
        <aside className="gate gate-locked">
          <div>
            <p className="gate-label">Members only</p>
            <p className="gate-text">Sign in to unlock the Green Room and set up your comedian profile.</p>
          </div>
          <GoogleSignInButton label="Sign in with Google" />
        </aside>
      )}

      <section aria-label="Jokes">
        {errorMessage ? (
          <p className="notice notice-error" role="alert">
            {errorMessage}
          </p>
        ) : jokes.length === 0 ? (
          <p className="notice">No jokes yet. Check back soon.</p>
        ) : (
          <ul className="joke-grid">
            {jokes.map((joke, index) => (
              <li key={joke.id} className="joke-card" style={{ "--tilt": `${[-1.2, 0.8, -0.6][index % 3]}deg` } as React.CSSProperties}>
                <article>
                  <span className="joke-number">#{String(index + 1).padStart(2, "0")}</span>
                  <div className="joke-image">
                    <Image
                      src={joke.image_url}
                      alt={joke.title}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                    />
                  </div>
                  <h2>{joke.title}</h2>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
