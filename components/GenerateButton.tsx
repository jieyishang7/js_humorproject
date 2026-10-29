"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

const STEPS = [
  { at: 0, label: "Reading your mood…" },
  { at: 25, label: "Picking spots…" },
  { at: 60, label: "Writing why you'll love them…" },
  { at: 85, label: "Almost there…" },
];

/**
 * Submit button for AI forms. While the AI works it turns into a progress bar.
 * The AI doesn't report progress, so the bar eases toward 95% over ~15 s and
 * jumps to done when the page updates.
 */
export function GenerateButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!pending) {
      setProgress(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      const seconds = (Date.now() - started) / 1000;
      setProgress(Math.min(95, Math.round(95 * (1 - Math.exp(-seconds / 6)))));
    }, 200);
    return () => clearInterval(timer);
  }, [pending]);

  if (!pending) {
    return (
      <button type="submit" className={`btn btn-${variant} btn-small`}>
        {label}
      </button>
    );
  }

  const step = [...STEPS].reverse().find((s) => progress >= s.at) ?? STEPS[0];
  return (
    <button
      type="submit"
      className={`btn btn-${variant} btn-small progress-btn`}
      disabled
      aria-busy="true"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-label={step.label}
    >
      <span className="progress-fill" style={{ width: `${progress}%` }} aria-hidden="true" />
      <span className="progress-text">
        {step.label} {progress}%
      </span>
    </button>
  );
}
