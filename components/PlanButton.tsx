"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { togglePlan } from "@/app/lounge/actions";

/** "Add to my plan" toggle for a recommended spot. */
export function PlanButton({ captionId, saved, signedIn }: { captionId: number; saved: boolean; signedIn: boolean }) {
  const [, startTransition] = useTransition();
  const [isSaved, setOptimistic] = useOptimistic(saved, (_current, next: boolean) => next);

  if (!signedIn) {
    return (
      <Link href="/login" className="plan-btn">
        ＋ Add to my plan
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="plan-btn"
      data-active={isSaved}
      aria-pressed={isSaved}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!isSaved);
          await togglePlan(captionId, !isSaved);
        })
      }
    >
      {isSaved ? "✓ In my plan" : "＋ Add to my plan"}
    </button>
  );
}
