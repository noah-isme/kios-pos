"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type UndoToastOptions = {
  label?: string;
  seconds?: number;
  onUndo?: () => Promise<void> | void;
};

export function useUndoToast() {
  return function showUndoToast({ label = "Dihapus", seconds = 6, onUndo }: UndoToastOptions) {
    return new Promise<boolean>((resolve) => {
      // Use a simple string message for the toast. The previous approach
      // mounted a DOM node and updated it periodically; that pattern causes
      // typing friction with ReactNode. Showing a static message here keeps
      // the behavior simple and strongly typed.
      const toastId = toast(`${label} — Undo`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await onUndo?.();
              toast.success("Aksi dibatalkan");
            } catch (err) {
              toast.error("Gagal membatalkan");
            }
            resolve(true);
          },
        },
      });
      // resolve false after timeout
      setTimeout(() => resolve(false), seconds * 1000 + 500);
    });
  };
}
