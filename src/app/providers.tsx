"use client";

import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { TRPCReactProvider } from "@/trpc/provider";
import { OutletProvider } from "@/lib/outlet-context";

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
        <OutletProvider>
          {children}
          <Toaster richColors position="top-center" />
        </OutletProvider>
      </TRPCReactProvider>
    </SessionProvider>
  );
};
