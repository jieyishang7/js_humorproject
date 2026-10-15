"use client";

import { useState } from "react";
import { createSpotRequest } from "@/app/lounge/actions";
import { GenerateButton } from "./GenerateButton";

const IDEAS = [
  "Rainy day study spot, under $15",
  "Cheap first date",
  "Lazy Sunday with nothing planned",
  "Show my parents around",
  "Late-night food after a deadline",
  "Somewhere quiet to clear my head",
];

/** "What are you in the mood for?" box with one-tap ideas. */
export function MoodForm() {
  const [mood, setMood] = useState("");

  return (
    <form action={createSpotRequest} className="panel mood-form">
      <label htmlFor="mood" className="mood-label">
        What are you in the mood for?
      </label>
      <div className="mood-row">
        <input
          id="mood"
          name="mood"
          value={mood}
          onChange={(event) => setMood(event.target.value)}
          placeholder="e.g. a cozy cafe to read near the 1 train"
          minLength={3}
          maxLength={200}
          required
          autoComplete="off"
        />
        <GenerateButton label="✨ Find spots" />
      </div>
      <div className="mood-ideas" aria-label="Ideas">
        <span>Try:</span>
        {IDEAS.map((idea) => (
          <button key={idea} type="button" className="chip" onClick={() => setMood(idea)} data-active={mood === idea}>
            {idea}
          </button>
        ))}
      </div>
    </form>
  );
}
