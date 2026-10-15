"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/profile/actions";

type Defaults = {
  first_name: string | null;
  last_name: string | null;
  tagline: string | null;
  current_area: string | null;
  cities_visited: string | null;
  favorite_spot: string | null;
};

type Props = { from: "welcome" | "profile"; defaults: Defaults; submitLabel: string };

const initialState: ProfileFormState = { status: "idle" };

const AREAS = [
  "Morningside Heights",
  "Upper West Side",
  "Upper East Side",
  "Harlem",
  "Midtown",
  "Chelsea",
  "Greenwich Village",
  "East Village",
  "Lower East Side",
  "SoHo",
  "Financial District",
  "Brooklyn (Williamsburg, Bushwick…)",
  "Brooklyn (Park Slope, Downtown…)",
  "Queens (Astoria, LIC…)",
  "The Bronx",
  "Not in NYC right now",
];

export function ProfileForm({ from, defaults, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="profile-form" noValidate>
      <input type="hidden" name="from" value={from} />

      <div className="field-row">
        <label className="field">
          <span className="field-label">First name</span>
          <input
            name="first_name"
            defaultValue={defaults.first_name ?? ""}
            autoComplete="given-name"
            maxLength={50}
            required
            aria-invalid={Boolean(errors.first_name)}
            placeholder="Jay"
          />
          {errors.first_name && <span className="field-error">{errors.first_name}</span>}
        </label>

        <label className="field">
          <span className="field-label">Last name</span>
          <input
            name="last_name"
            defaultValue={defaults.last_name ?? ""}
            autoComplete="family-name"
            maxLength={50}
            required
            aria-invalid={Boolean(errors.last_name)}
            placeholder="Shang"
          />
          {errors.last_name && <span className="field-error">{errors.last_name}</span>}
        </label>
      </div>

      <p className="form-group-title">
        About you <span>Optional · helps the AI pick better spots for you</span>
      </p>

      <div className="field-row">
        <label className="field">
          <span className="field-label">📍 Which part of NYC are you in?</span>
          <select
            name="current_area"
            defaultValue={defaults.current_area ?? ""}
            aria-invalid={Boolean(errors.current_area)}
          >
            <option value="">Choose an area…</option>
            {AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
            {defaults.current_area && !AREAS.includes(defaults.current_area) && (
              <option value={defaults.current_area}>{defaults.current_area}</option>
            )}
          </select>
          {errors.current_area && <span className="field-error">{errors.current_area}</span>}
        </label>

        <label className="field">
          <span className="field-label">☕ Your favorite third place</span>
          <input
            name="favorite_spot"
            defaultValue={defaults.favorite_spot ?? ""}
            maxLength={120}
            aria-invalid={Boolean(errors.favorite_spot)}
            placeholder="Hungarian Pastry Shop"
          />
          {errors.favorite_spot && <span className="field-error">{errors.favorite_spot}</span>}
        </label>
      </div>

      <label className="field">
        <span className="field-label">🌍 Cities you&apos;ve been to</span>
        <input
          name="cities_visited"
          defaultValue={defaults.cities_visited ?? ""}
          maxLength={200}
          aria-invalid={Boolean(errors.cities_visited)}
          placeholder="Chicago, Tokyo, Paris"
        />
        <span className="field-hint">Separate with commas.</span>
        {errors.cities_visited && <span className="field-error">{errors.cities_visited}</span>}
      </label>

      <label className="field">
        <span className="field-label">✨ Your vibe in one line</span>
        <input
          name="tagline"
          defaultValue={defaults.tagline ?? ""}
          maxLength={120}
          aria-invalid={Boolean(errors.tagline)}
          placeholder="Bookstores by day, rooftops by night."
        />
        {errors.tagline && <span className="field-error">{errors.tagline}</span>}
      </label>

      <div className="form-footer">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.message && (
          <p className={state.status === "saved" ? "form-success" : "form-error"} role="status">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
