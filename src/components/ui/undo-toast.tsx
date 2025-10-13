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
      let remaining = seconds;

      const container = document.createElement("span");
      const update = () => {
        container.textContent = `${label} — Undo (${remaining})`;
      };

      update();

      const interval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(interval);
        }
        update();
      }, 1000);

      const toastId = toast(messageMount(container), {
        action: {
          label: "Undo",
          onClick: async () => {
            clearInterval(interval);
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

      // resolve false after countdown
      setTimeout(() => {
        clearInterval(interval);
        resolve(false);
      }, seconds * 1000 + 500);

      function messageMount(node: HTMLElement) {
        return node as any;
      }
    });
  };
}
