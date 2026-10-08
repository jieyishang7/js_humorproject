"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { saveAvatar } from "@/app/profile/actions";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Props = { userId: string; initialUrl: string | null; initials: string };

export function AvatarUploader({ userId, initialUrl, initials }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
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

    setStatus({ kind: "busy", text: "Uploading…" });
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    // A new file name each time, so browsers never show a cached old photo.
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, cacheControl: "3600" });

    if (uploadError) {
      setStatus({ kind: "error", text: `Upload failed: ${uploadError.message}` });
      return;
    }

    const result = await saveAvatar(path);
    if (!result.ok || !result.url) {
      setStatus({ kind: "error", text: result.message ?? "Couldn't save your photo." });
      return;
    }

    // Only one profile photo is kept: remove the older files in this user's folder.
    const { data: files } = await supabase.storage.from("avatars").list(userId);
    const stale = (files ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
    if (stale.length > 0) await supabase.storage.from("avatars").remove(stale);

    setUrl(result.url);
    setStatus({ kind: "ok", text: "New photo saved." });
    router.refresh(); // update the avatar in the header too
  }

  return (
    <div className="avatar-uploader">
      <div className="avatar avatar-xl">
        {url ? <Image src={url} alt="Your profile photo" fill unoptimized sizes="160px" /> : <span>{initials}</span>}
      </div>

      <div className="avatar-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => inputRef.current?.click()}
          disabled={status.kind === "busy"}
        >
          {status.kind === "busy" ? "Uploading…" : url ? "Change photo" : "Upload a photo"}
        </button>
        <p className="hint">JPG, PNG, WebP or GIF · up to 5 MB</p>
        {status.text && status.kind !== "busy" && (
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
