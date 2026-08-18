import type { Metadata } from "next";
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
