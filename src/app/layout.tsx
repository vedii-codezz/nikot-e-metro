import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nikot-e-Metro | Kolkata Metro Navigation & Routing",
  description:
    "Discover the nearest metro station in Kolkata and plan seamless metro journeys across Line 1 (Blue), Line 2 (Green), Line 3 (Purple), and Line 6 (Orange).",
  keywords: [
    "Kolkata Metro",
    "Nearest Metro",
    "Metro Route Planner",
    "Nikot-e-Metro",
    "Kolkata Transport",
    "East West Metro",
    "Esplanade Interchange",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-transit-bg text-transit-text flex flex-col antialiased selection:bg-metro-blue/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
