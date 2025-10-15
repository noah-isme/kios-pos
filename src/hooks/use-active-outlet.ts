"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { api } from "@/trpc/client";

const STORAGE_KEY = "kios-pos:active-outlet";

type OutletOption = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
};

export function useActiveOutlet() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const outletsQuery = api.outlets.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const [activeOutletId, setActiveOutletId] = useState<string | null>(null);
  const [hydratedFromStorage, setHydratedFromStorage] = useState(false);

  // Hydrate from localStorage after auth succeeds
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveOutletId(null);
      setHydratedFromStorage(false);
      return;
    }

    if (hydratedFromStorage) return;
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveOutletId(stored);
    }
    setHydratedFromStorage(true);
  }, [isAuthenticated, hydratedFromStorage]);

  // When outlets load, ensure the active outlet is valid. Fallback to the first outlet.
  useEffect(() => {
    if (!isAuthenticated) return;
    const outlets = outletsQuery.data;
    if (!outlets?.length) return;

    const hasActive = activeOutletId && outlets.some((outlet) => outlet.id === activeOutletId);

    if (!hasActive) {
      const fallback = outlets[0];
      if (fallback) {
        setActiveOutletId(fallback.id);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, fallback.id);
        }
      }
    }
  }, [activeOutletId, outletsQuery.data, isAuthenticated]);

  const setActiveOutlet = (outletId: string) => {
    setActiveOutletId(outletId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, outletId);
    }
  };

  const activeOutlet: OutletOption | null = useMemo(() => {
    const outlets = outletsQuery.data;
    if (!outlets?.length) return null;
    const found = outlets.find((outlet) => outlet.id === activeOutletId);
    return found ?? outlets[0];
  }, [activeOutletId, outletsQuery.data]);

  return {
    outlets: outletsQuery.data ?? [],
    isLoading: outletsQuery.isLoading,
    activeOutlet,
    activeOutletId,
    setActiveOutlet,
  };
}

