"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateSpotImage } from "@/app/lounge/actions";

/** "Generate picture" for a recommended spot. Image generation can take ~10–20 s. */
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
            const result = await generateSpotImage(captionId);
            if (result.ok) router.refresh();
            else setMessage(result.message ?? "Couldn't make a picture.");
          })
        }
      >
        {pending ? (
          <>
            <span className="spinner" aria-hidden="true" /> Painting…
          </>
        ) : (
          "🎨 Generate picture"
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
