import Image from "next/image";
import { connection } from "next/server";
import { getJokes, type Joke } from "@/lib/supabase";

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

  return (
    <main>
      <header>
        <span className="brand">js_humorproject</span>
        <span className="week">WEEK 02</span>
      </header>
      <section aria-labelledby="gallery-title">
        <p className="eyebrow">THE HUMOR PROJECT</p>
        <h1 id="gallery-title">A little homework.<br /><span>A little humor.</span></h1>
        <p className="intro">For the moments every student knows a little too well.</p>
        {errorMessage ? (
          <p className="notice" role="alert">{errorMessage}</p>
        ) : jokes.length === 0 ? (
          <p className="notice">No jokes yet. Check back soon.</p>
        ) : (
          <ul className="joke-grid">
            {jokes.map((joke) => (
              <li key={joke.id} className="joke-card">
                <article>
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
      <footer><span>The Humor Project · Assignment 02</span><span>Small moments. Shared laughs.</span></footer>
    </main>
  );
}
