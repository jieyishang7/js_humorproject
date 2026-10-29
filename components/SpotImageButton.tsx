"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findSpotPhoto } from "@/app/lounge/actions";

/** "Show food photo": AI picks a signature dish, then we find a real photo of it on Wikipedia. */
export function SpotImageButton({ captionId }: { captionId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <span className="spot-image-action">
      <button
        type="button"
        className="plan-btn"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await findSpotPhoto(captionId);
            if (result.ok) router.refresh();
            else setMessage(result.message ?? "No photo found.");
          })
        }
      >
        {pending ? (
          <>
            <span className="spinner" aria-hidden="true" /> Looking…
          </>
        ) : (
          "🍜 Show food photo"
        )}
      </button>
      {message && (
        <span className="spot-image-error" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
