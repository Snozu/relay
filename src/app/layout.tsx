import type { Metadata, Viewport } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Onest carries the house voice: geometric, warm, confident at large sizes.
// JetBrains Mono carries every number, identifier and micro-label.
const onest = Onest({ variable: "--font-onest", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Relay — Operations Console",
  description:
    "An AI agent that answers from your own operational data and takes governed actions with human approval.",
};

// The composer sits on the bottom edge. `cover` lets it read the safe-area
// inset and stay clear of the home indicator instead of hiding under it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${onest.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
