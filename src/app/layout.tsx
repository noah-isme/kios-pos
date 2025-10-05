import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { getServerAuthSession } from "@/server/auth";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kios POS",
  description:
    "Modern POS berbasis Next.js dengan tRPC, Prisma, Supabase, dan shadcn/ui.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers session={session}>
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
