import type { Metadata } from "next";
import { NavBar } from "@/components/ui/nav-bar";
import "./globals.css";

const SITE_URL = "https://fitretro.app";
const DESCRIPTION =
  "Track workouts, nutrition, body measurements, and habits in one place — with AI-assisted macro estimation so logging a meal takes seconds, not a food scale.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FitRetro",
    template: "%s · FitRetro",
  },
  description: DESCRIPTION,
  keywords: [
    "workout tracker",
    "macro tracker",
    "nutrition tracker",
    "fitness app",
    "habit tracker",
    "body measurements",
  ],
  openGraph: {
    title: "FitRetro",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "FitRetro",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FitRetro",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NavBar />
        {children}
        <footer className="mt-auto py-2 text-center text-[10px] text-muted-foreground/50">
          {process.env.NEXT_PUBLIC_GIT_SHA}
        </footer>
      </body>
    </html>
  );
}
