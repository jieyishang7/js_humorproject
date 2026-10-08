"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileFormState } from "@/app/profile/actions";

type Props = {
  from: "welcome" | "profile";
  defaults: { first_name: string | null; last_name: string | null; tagline: string | null };
  submitLabel: string;
};

const initialState: ProfileFormState = { status: "idle" };

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

      <label className="field">
        <span className="field-label">
          Your humor in one line <em>optional</em>
        </span>
        <input
          name="tagline"
          defaultValue={defaults.tagline ?? ""}
          maxLength={120}
          aria-invalid={Boolean(errors.tagline)}
          placeholder="Laughs first, debugs later."
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
