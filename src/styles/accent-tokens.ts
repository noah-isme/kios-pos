export type AccentKey = "amber" | "sky" | "emerald";

export const ACCENTS: Record<AccentKey, { icon: string; gradient: string }> = {
  amber: {
    icon: "bg-accent-amber-100 text-accent-amber-700",
    gradient: "bg-gradient-to-br from-accent-amber-50 via-accent-amber-100 to-accent-amber-200",
  },
  sky: {
    icon: "bg-accent-sky-100 text-accent-sky-700",
    gradient: "bg-gradient-to-br from-accent-sky-50 via-accent-sky-100 to-accent-sky-200",
  },
  emerald: {
    icon: "bg-accent-emerald-100 text-accent-emerald-700",
    gradient: "bg-gradient-to-br from-accent-emerald-50 via-accent-emerald-100 to-accent-emerald-200",
  },
};

export default ACCENTS;
