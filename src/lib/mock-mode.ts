let initialized: Promise<boolean> | null = null;

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

export const startMockMode = async () => {
  if (typeof window === "undefined" || hasSupabaseConfig || isProduction) {
    return false;
  }

  if (!initialized) {
    initialized = import("@/mocks/browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .then(() => true)
      .catch(() => false);
  }

  return initialized;
};
