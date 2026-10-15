import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Spot Finder NYC",
  description: "Tell the AI your mood, get three New York spots, and vote on the best picks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <span>Spot Finder NYC · The Humor Project</span>
          <span>AI picks. Student votes.</span>
        </footer>
      </body>
    </html>
  );
}
