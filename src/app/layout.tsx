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
          <div className="min-h-screen bg-background text-foreground">
            <div className="fixed inset-x-0 top-0 z-50">
              <SiteHeader />
            </div>

            <div className="mx-auto mt-16 grid max-w-7xl grid-cols-12 gap-6 px-4 py-8">
              {/* Sidebar (col-span 2) + Content (col-span 10) */}
              <div className="col-span-12 md:col-span-2">
                {/* Sidebar will render only on md+ */}
                <div className="hidden md:block">
                  {/* Sidebar is a client component */}
                  {/* Importing client component */}
                  {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
                  {typeof window !== 'undefined' ? require('@/components/layout/sidebar').default() : null}
                </div>
              </div>

              <main className="col-span-12 md:col-span-10">
                <PageProgress />
                <PageTransition keyProp={typeof children === 'object' ? undefined : undefined}>
                  {children}
                </PageTransition>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
