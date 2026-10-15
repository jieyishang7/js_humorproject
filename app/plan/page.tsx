import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaptionContent } from "@/components/CaptionList";
import { PlanButton } from "@/components/PlanButton";
import { getPlan } from "@/lib/captions";
import { getCurrentUser } from "@/lib/profile";

export const metadata: Metadata = { title: "My plan | Spot Finder NYC" };

/** Members-only: the spots this user has saved. */
export default async function PlanPage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await getPlan(user.id);

  return (
    <main className="page">
      <section className="hero hero-compact">
        <p className="kicker">
          <span className="kicker-dot" aria-hidden="true" /> My plan
        </p>
        <h1 className="hero-title">
          Your <span className="highlight">list</span>
          {profile?.first_name ? `, ${profile.first_name}` : ""}.
        </h1>
        <p className="hero-intro">
          {plan.length === 0
            ? "Nothing saved yet."
            : `${plan.length} spot${plan.length === 1 ? "" : "s"} saved. Tap Open in Maps when you're ready to go.`}
        </p>
      </section>

      {plan.length === 0 ? (
        <div className="panel plan-empty">
          <p>Find a spot you like and tap ＋ Add to my plan. It&apos;ll show up here.</p>
          <Link href="/lounge" className="btn btn-primary">
            ✨ Find spots
          </Link>
        </div>
      ) : (
        <ul className="plan-grid">
          {plan.map((item) => (
            <li key={item.caption_id} className="panel plan-card">
              {item.mood && <p className="lab-label">From “{item.mood}”</p>}
              <CaptionContent content={item.content} />
              <div className="caption-actions">
                <PlanButton captionId={item.caption_id} saved signedIn />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
