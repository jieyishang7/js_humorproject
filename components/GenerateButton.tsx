"use client";

import { useFormStatus } from "react-dom";

/** Submit button for "generate a caption" forms; shows progress while the AI works. */
export function GenerateButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant} btn-small`} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" /> AI is writing…
        </>
      ) : (
        label
      )}
    </button>
  );
}
