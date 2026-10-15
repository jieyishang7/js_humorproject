"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { vote } from "@/app/lounge/actions";

type Props = { captionId: number; score: number; myVote: -1 | 0 | 1; signedIn: boolean };

/**
 * Up/down vote that updates instantly (optimistic) and saves in the background,
 * so the page never reloads or jumps. Signed-out visitors get a sign-in link.
 */
export function VoteButtons({ captionId, score, myVote, signedIn }: Props) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic({ score, myVote }, (current, value: 1 | -1) => {
    const next = current.myVote === value ? 0 : value; // same button again = undo
    return { score: current.score - current.myVote + next, myVote: next as -1 | 0 | 1 };
  });

  if (!signedIn) {
    return (
      <div className="vote-box vote-box-locked">
        <span className="vote-score" aria-label={`Score ${score}`}>
          {score}
        </span>
        <Link href="/login" className="vote-signin">
          Sign in to vote
        </Link>
      </div>
    );
  }

  function cast(value: 1 | -1) {
    startTransition(async () => {
      setOptimistic(value);
      const data = new FormData();
      data.set("caption_id", String(captionId));
      data.set("value", String(value));
      await vote(data);
    });
  }

  return (
    <div className="vote-box" aria-busy={pending}>
      <button
        type="button"
        className="vote-btn vote-up"
        data-active={state.myVote === 1}
        aria-pressed={state.myVote === 1}
        aria-label="Funny — upvote"
        title="Funny"
        onClick={() => cast(1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 3 15h6v5h6v-5h6z" fill="currentColor" />
        </svg>
      </button>
      <span className="vote-score" aria-live="polite">
        {state.score}
      </span>
      <button
        type="button"
        className="vote-btn vote-down"
        data-active={state.myVote === -1}
        aria-pressed={state.myVote === -1}
        aria-label="Not funny — downvote"
        title="Not funny"
        onClick={() => cast(-1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20 3 9h6V4h6v5h6z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
