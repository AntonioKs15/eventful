import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/query/query-provider";
import "./globals.css";

const displayFont = Big_Shoulders({
  variable: "--font-display",
  weight: ["600", "700", "900"],
  subsets: ["latin"],
});

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono-ticket",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eventful",
  description:
    "Reserve seats, hold your spot in the pit, and walk in with a ticket that cannot be faked.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-ink-950 text-paper antialiased">
        <QueryProvider>
          <AuthProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
