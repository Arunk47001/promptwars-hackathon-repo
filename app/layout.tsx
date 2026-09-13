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
      <body>{children}</body>
    </html>
  );
}
