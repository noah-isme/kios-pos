"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/trpc/client";

interface Outlet {
  id: string;
  name: string;
  code: string;
  address?: string;
}

interface UserOutlet {
  id: string;
  outletId: string;
  role: "OWNER" | "MANAGER" | "CASHIER";
  outlet: Outlet;
}

interface OutletContextType {
  currentOutlet: Outlet | null;
  userOutlets: UserOutlet[];
  setCurrentOutlet: (outlet: Outlet) => void;
  isLoading: boolean;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: ReactNode }) {
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
  const [userOutlets, setUserOutlets] = useState<UserOutlet[]>([]);

  // Get user's accessible outlets
  const { data: outletsData, isLoading } = api.outlets.getUserOutlets.useQuery();

  useEffect(() => {
    if (outletsData && outletsData.length > 0) {
      setUserOutlets(outletsData);

      // Set first outlet as default if no current outlet
      if (!currentOutlet) {
        setCurrentOutlet(outletsData[0].outlet);
      }
    }
  }, [outletsData, currentOutlet]);

  // Persist current outlet to localStorage
  useEffect(() => {
    if (currentOutlet) {
      localStorage.setItem("kios-pos:current-outlet", JSON.stringify(currentOutlet));
    }
  }, [currentOutlet]);

  // Load current outlet from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("kios-pos:current-outlet");
    if (saved) {
      try {
        const outlet = JSON.parse(saved);
        setCurrentOutlet(outlet);
      } catch (error) {
        console.error("Failed to parse saved outlet:", error);
      }
    }
  }, []);

  const value: OutletContextType = {
    currentOutlet,
    userOutlets,
    setCurrentOutlet,
    isLoading,
  };

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (context === undefined) {
    throw new Error("useOutlet must be used within an OutletProvider");
  }
  return context;
}