let initializing: Promise<boolean> | null = null;
type MockWorker = Awaited<typeof import("@/mocks/browser")>["worker"];
let activeWorker: MockWorker | null = null;

const enableDemoFlag = process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";

const shouldEnableMock = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (enableDemoFlag) {
    return true;
  }

  const { pathname } = window.location;
  return pathname.startsWith("/demo");
};

const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

export const startMockMode = async (): Promise<boolean> => {
  if (typeof window === "undefined") {
    return false;
  }

  const allowMock = shouldEnableMock();

  if (!allowMock) {
    await stopMockMode();
    return false;
  }

  if (hasSupabaseConfig && !enableDemoFlag && !window.location.pathname.startsWith("/demo")) {
    // In production with Supabase configured we only allow mocks on explicit demo routes or when the flag is set.
    await stopMockMode();
    return false;
  }

  if (isProduction && !allowMock) {
    await stopMockMode();
    return false;
  }

  if (activeWorker) {
    return true;
  }

  if (!initializing) {
    initializing = import("@/mocks/browser")
      .then(async ({ worker }) => {
        activeWorker = worker;
        await worker.start({ onUnhandledRequest: "bypass" });
        return true;
      })
      .catch((error) => {
        console.error("Failed to start mock mode", error);
        activeWorker = null;
        return false;
      })
      .finally(() => {
        initializing = null;
      });
  }

  return initializing;
};

export const stopMockMode = async (): Promise<boolean> => {
  if (!activeWorker) {
    return false;
  }

  try {
    await activeWorker.stop();
    activeWorker = null;
    return true;
  } catch (error) {
    console.error("Failed to stop mock mode", error);
    return false;
  }
};
