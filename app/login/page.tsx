import type { Metadata } from "next";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export const metadata: Metadata = { title: "Sign in | Spot Finder NYC" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className="page page-narrow">
      <section className="panel login-panel">
        <span className="sticker" aria-hidden="true">
          Spot Finder NYC
        </span>
        <h1 className="panel-title">Find your next favorite spot</h1>
        <p className="panel-intro">
          Sign in with Google to get AI picks for your mood, like the best ones, and save spots to your plan. New here? Your profile is created automatically.
        </p>

        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}

        <GoogleSignInButton />

        <p className="fine-print">
          We only use your name, email and the details you choose to share. <Link href="/">Back to home</Link>
        </p>
      </section>
    </main>
  );
}
