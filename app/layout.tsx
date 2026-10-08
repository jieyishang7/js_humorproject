import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Joke Gallery | js_humorproject",
  description: "A joke gallery for The Humor Project, powered by Supabase, with Google sign-in and member profiles.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <span>The Humor Project · Assignment 03</span>
          <span>Small moments. Shared laughs.</span>
        </footer>
      </body>
    </html>
  );
}
