import type { Metadata } from "next";
import "../ui/blueprint.css";

export const metadata: Metadata = {
  title: "Mahjong Coach",
  description: "A teaching-first Mahjong table.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500&family=Walter+Turncoat&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
