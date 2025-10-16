"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("kios-pos-onboarding-seen");
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("kios-pos-onboarding-seen", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-border rounded-lg shadow-lg p-4 max-w-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-sm">Selamat Datang!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Klik tombol &quot;Mulai Transaksi&quot; di bawah untuk memulai penjualan hari ini.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={handleClose}>
              Mengerti
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}