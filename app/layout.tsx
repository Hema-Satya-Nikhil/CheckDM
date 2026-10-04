import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = localFont({
  src: "../public/fonts/geist-latin.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "CheckDM — Instagram comment-to-DM automation",
  description:
    "CheckDM turns Instagram comments into private replies. Match a keyword on a post or reel and send a DM automatically, with delivery logs for every send.",
  keywords: [
    "instagram automation",
    "comment to dm",
    "instagram private replies",
    "instagram dm automation",
    "social commerce",
    "checkdm",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CheckDM",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "CheckDM — Instagram comment-to-DM automation",
    description:
      "Match a keyword on a post or reel and CheckDM sends the private reply for you.",
    type: "website",
    siteName: "CheckDM",
  },
};

export const viewport: Viewport = {
  // Must match `theme_color` in app/manifest.ts, or the browser chrome and the
  // installed app disagree on brand colour.
  themeColor: "#0a1526",
  width: "device-width",
  initialScale: 1,
  // Installed on iOS the app owns the full screen, notch included; the safe
  // area insets below keep content clear of the system UI.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${geist.variable}`}>
      <body
        className="min-h-full bg-background text-foreground font-sans antialiased"
        // Clears the home indicator when installed; 0 everywhere else.
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}