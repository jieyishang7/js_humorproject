"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { captionUpload } from "@/app/lounge/actions";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Uploads a photo to Storage, then asks the server to save it and have the AI caption it. */
export function PhotoUploader({ userId }: { userId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "ok" | "error"; text?: string }>({ kind: "idle" });

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      setStatus({ kind: "error", text: "Please choose a JPG, PNG, WebP or GIF." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({ kind: "error", text: "That photo is over 5 MB. Try a smaller one." });
      return;
    }

    setStatus({ kind: "busy", text: "Uploading and asking the AI…" });
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error } = await createClient()
      .storage.from("uploads")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });
    if (error) {
      setStatus({ kind: "error", text: `Upload failed: ${error.message}` });
      return;
    }

    const result = await captionUpload(path);
    setStatus(result.ok ? { kind: "ok", text: "Captioned! Now vote on it below." } : { kind: "error", text: result.message });
    router.refresh();
  }

  return (
    <div className="panel photo-uploader">
      <div>
        <h3 className="pick-title">Got a photo? Let the AI roast it.</h3>
        <p className="hint">Upload a pic from your camera roll and the AI writes a caption everyone can vote on.</p>
      </div>
      <div className="avatar-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => inputRef.current?.click()}
          disabled={status.kind === "busy"}
        >
          {status.kind === "busy" ? "Working…" : "📸 Upload a photo"}
        </button>
        {status.text && (
          <p className={status.kind === "error" ? "form-error" : "form-success"} role="status">
            {status.text}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
