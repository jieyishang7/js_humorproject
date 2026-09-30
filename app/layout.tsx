import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hello World | js_humorproject",
  description: "Week 1: Hello World — a first Next.js app for The Humor Project.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
