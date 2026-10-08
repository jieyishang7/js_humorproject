import Image from "next/image";
import Link from "next/link";
import { displayName, getCurrentUser, initials } from "@/lib/profile";

export async function SiteHeader() {
  let session: Awaited<ReturnType<typeof getCurrentUser>> = { user: null, profile: null };
  try {
    session = await getCurrentUser();
  } catch {
    // Missing env vars: the page itself shows the configuration error.
  }
  const { user, profile } = session;

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="logo" aria-label="js_humorproject home">
          <span className="logo-mark" aria-hidden="true">
            ha
          </span>
          <span className="logo-text">js_humorproject</span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          <Link href="/">Gallery</Link>
          <Link href="/lounge" className="nav-locked" data-locked={!user}>
            Green Room
            {!user && (
              <svg aria-label="members only" width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2.5" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            )}
          </Link>
        </nav>

        <div className="site-account">
          {user ? (
            <>
              <Link href="/profile" className="account-chip" title="Your profile">
                <span className="avatar avatar-sm">
                  {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" fill unoptimized sizes="32px" />
                  ) : (
                    <span>{initials(profile, user)}</span>
                  )}
                </span>
                <span className="account-name">{displayName(profile, user)}</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn btn-ghost btn-small">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary btn-small">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
