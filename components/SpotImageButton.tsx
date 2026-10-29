"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { findSpotPhoto } from "@/app/lounge/actions";

// One photo at a time across the page, so a long list doesn't hit rate limits.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Older recommendations made before food photos existed: generate the photo
 * automatically when the spot is shown. Saved once, so it only runs the first time.
 */
export function SpotImageButton({ captionId }: { captionId: number }) {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<"working" | "done" | "failed">("working");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    enqueue(() => findSpotPhoto(captionId))
      .then((result) => {
        setState(result.ok ? "done" : "failed");
        if (result.ok) router.refresh();
      })
      .catch(() => setState("failed"));
  }, [captionId, router]);

  if (state !== "working") return null;
  return (
    <span className="spot-image-action spot-image-loading" role="status">
      <span className="spinner" aria-hidden="true" /> Cooking up a food photo…
    </span>
  );
}
