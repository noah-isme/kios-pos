import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { getServerAuthSession } from "@/server/auth";
import PageTransition from '@/components/ui/page-transition';
import PageProgress from '@/components/ui/page-progress';

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
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <SiteHeader />
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
              <PageProgress />
              {/* Page transitions on client navigation */}
              <PageTransition keyProp={typeof children === 'object' ? undefined : undefined}>
                {children}
              </PageTransition>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
