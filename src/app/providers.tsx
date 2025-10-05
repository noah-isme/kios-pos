"use client";

import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { TRPCReactProvider } from "@/trpc/provider";

export const Providers = ({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) => {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider>
        {children}
        <Toaster richColors position="top-center" />
      </TRPCReactProvider>
    </SessionProvider>
  );
};
