import type { Metadata } from "next";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const metadata: Metadata = { title: "Sign in | js_humorproject" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="page page-narrow">
      <section className="panel login-panel">
        <span className="sticker" aria-hidden="true">
          backstage pass
        </span>
        <h1 className="panel-title">Sign in to the Humor Project</h1>
        <p className="panel-intro">
          Use your Google account. New here? Signing in for the first time creates your profile automatically.
        </p>

        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}

        <GoogleSignInButton />

        <p className="fine-print">
          We only use your name, email and the photo you choose. <Link href="/">Back to the gallery</Link>
        </p>
      </section>
    </main>
  );
}
