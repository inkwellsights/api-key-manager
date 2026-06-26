import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ShellClient } from "@/components/layout/ShellClient";
import { getStats } from "@/server/logs";
import { SwRegister } from "./sw-register";

// Dashboard data changes on every request — disable static prerender
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "API Key Manager",
  description: "Manage and secure your API keys",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "API Keys",
  },
};

// themeColor must live in viewport, not metadata (Next.js 15+).
export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch stats on the server so the Sidebar (client component) never
  // needs to touch the DB directly.
  const stats = await getStats();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-bg text-text">
        <ShellClient
          requestsThisMonth={stats.requestsThisMonth}
          total={stats.total}
        >
          {children}
        </ShellClient>
        <SwRegister />
      </body>
    </html>
  );
}
