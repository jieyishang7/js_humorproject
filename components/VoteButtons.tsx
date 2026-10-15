"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { vote } from "@/app/lounge/actions";

type Props = { captionId: number; score: number; myVote: -1 | 0 | 1; signedIn: boolean };

/**
 * A single heart "like". It updates instantly (optimistic) and saves in the
 * background; tapping again removes the like. Signed-out visitors see the
 * count and a sign-in link.
 */
export function VoteButtons({ captionId, score, myVote, signedIn }: Props) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic({ score, liked: myVote === 1 }, (current) => ({
    liked: !current.liked,
    score: current.score + (current.liked ? -1 : 1),
  }));

  const heart = (filled: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.4 1.1 5 2.9 1.6-1.8 3-2.9 5-2.9 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!signedIn) {
    return (
      <Link href="/login" className="like-btn" title="Sign in to like" aria-label={`${score} likes. Sign in to like`}>
        {heart(false)}
        <span className="like-count">{score}</span>
      </Link>
    );
  }

  function toggle() {
    startTransition(async () => {
      setOptimistic(null);
      const data = new FormData();
      data.set("caption_id", String(captionId));
      // Liking again sends the same value, which the server treats as "remove".
      data.set("value", "1");
      await vote(data);
    });
  }

  return (
    <button
      type="button"
      className="like-btn"
      data-active={state.liked}
      aria-pressed={state.liked}
      aria-busy={pending}
      aria-label={state.liked ? "Unlike" : "Like"}
      title={state.liked ? "Unlike" : "Like"}
      onClick={toggle}
    >
      {heart(state.liked)}
      <span className="like-count" aria-live="polite">
        {state.score}
      </span>
    </button>
  );
}
