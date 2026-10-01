import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joke Gallery | js_humorproject",
  description: "A simple joke gallery for The Humor Project, powered by Supabase.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
