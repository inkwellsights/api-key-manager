import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ShellClient } from "@/components/layout/ShellClient";
import { getStats } from "@/server/logs";

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
      </body>
    </html>
  );
}
