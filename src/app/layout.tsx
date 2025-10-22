import * as React from "react";
import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { getServerAuthSession } from "@/server/auth";
import PageTransition from "@/components/ui/page-transition";
import PageProgress from "@/components/ui/page-progress";

import "./globals.css";

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
      <body className="antialiased font-sans">
        <Providers session={session}>
          <div className="min-h-screen bg-background text-foreground">
            <a
              href="#main-content"
              className="fixed left-4 top-4 z-[100] -translate-y-24 inline-flex rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Lewati ke konten utama
            </a>
            <SiteHeader />
            <main
              id="main-content"
              className="mx-auto mt-20 w-full max-w-screen-2xl px-6 pb-10 pt-6 sm:px-8 lg:px-12"
            >
              <PageProgress />
              <PageTransition
                keyProp={typeof children === "object" ? undefined : undefined}
              >
                {children}
              </PageTransition>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
