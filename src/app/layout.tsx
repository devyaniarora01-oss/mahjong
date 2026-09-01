import type { Metadata } from "next";
import "./globals.css";

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
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <style>{`body,button,input,textarea{font-family:"Manrope",sans-serif!important}h1,h2,h3,.landing h1,header h1,.action-panel h2,.coach-drawer h2,.coach-drawer h3,.tutorial-panel h2,.review h2,.review h3{font-family:"Fraunces",Georgia,serif!important;font-weight:600!important}.eyebrow,.seat-identity,.wall-stack strong,.flower-stack strong,.discard-zone strong,.draw-wall-visual strong,.controls,.action-panel,.coach-drawer,.review,button{font-family:"Manrope",sans-serif!important}.center-panel,.center-panel *{font-family:"IBM Plex Mono",monospace!important;font-weight:500!important}`}</style>
        {children}
      </body>
    </html>
  );
}
