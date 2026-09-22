import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRICS Citizen Infrastructure Platform",
  description:
    "Multilingual citizen intake and demand-hotspot fusion dashboard (India demo)."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* IBM Plex Sans/Mono (C1 of
            .squad/task/redesign-dashboard-per-design-canvas.md), matching
            the <link> tags in
            design/BRICS Citizen Infrastructure Platform.dc.html so every
            app page - not just /dashboard - loads the same typography. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
