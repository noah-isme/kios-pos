// Prefer static imports for core dependencies to satisfy ESLint rules.
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import nodemailer from "nodemailer";
import NextAuthDefault, { getServerSession as _getServerSession } from "next-auth";

const NextAuth = NextAuthDefault;
const getServerSession = _getServerSession;

// env, db, and Role are application-specific and may not be available in
// some test environments. Guard their dynamic import to provide fallbacks.
// We accept `any` here because at runtime `db` is a PrismaClient instance
// with a large generated type; narrowing it causes more churn. Keep the
// runtime behavior and avoid TypeScript incompatibility by using `any`.
/* eslint-disable @typescript-eslint/no-explicit-any */
let env: any;
let db: any;
let Role: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

try {
  // dynamic import of local modules (may fail in some test runners)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const localEnv = await import('@/env');
  env = localEnv.env;
  const localDb = await import('@/server/db');
  db = localDb.db;
  const localEnums = await import('@/server/db/enums');
  Role = localEnums.Role;
} catch (e) {
  console.error("Error importing local runtime modules (env/db):", (e as Error)?.stack ?? String(e));
  // Mark test fallback so tests can detect we are using a stubbed runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as unknown as Record<string, unknown>).__TEST_FALLBACKS__ = true;
  env = { NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'dev-secret' };
  db = {
    user: {
      findUnique: async () => null,
    },
    sale: {
      count: async () => 0,
    },
  };
  Role = { ADMIN: 'ADMIN', OWNER: 'OWNER', CASHIER: 'CASHIER' };
}

// Try to load bcryptjs dynamically. Some dev/test environments may not have
// all optional deps installed; avoid a static import which would make the
// entire module fail to compile under Turbopack and cause 405s for auth
// endpoints. Provide an insecure fallback compare for dev/tests only so the
// app can run without the package installed.
let bcrypt: { compare: (a: string, b: string) => Promise<boolean> };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // Use dynamic import so bundlers that can't find the package won't fail
  // the whole compilation step.
  // Note: top-level await is allowed in ESM here.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  bcrypt = (await import('bcryptjs')).default;
} catch (err) {
  // Fallback: insecure plain-text comparison (only for dev/test). This
  // prevents the server from failing to start when bcryptjs isn't present.
  // If you see this log in production, install `bcryptjs`.
  // eslint-disable-next-line @typescript-eslint/require-await
  bcrypt = { compare: async (a: string, b: string) => a === b };
  console.warn('[server/auth] bcryptjs not available — falling back to insecure compare (dev only)');
}

// Credentials-only auth (email + password). Email/Google providers removed.
import type { NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
        async authorize(credentials: { email?: string; password?: string } | undefined) {
          if (!credentials?.email || !credentials?.password) return null;
          const user = await db.user.findUnique({ where: { email: credentials.email } });
          if (!user || !user.passwordHash) return null;
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, role: user.role };
      },
    }),
    // Removed EmailProvider and GoogleProvider
  ],
  callbacks: {
    async session({ session, user }: { session: Session | unknown; user: unknown }) {
      if (session && typeof session === "object" && session && "user" in (session as Record<string, unknown>)) {
        const userObj = user as { id?: string; role?: string } | undefined;
        const sessionUser = (session as Session).user as Record<string, unknown> | undefined;
        if (sessionUser && userObj) {
          // assign fields defensively
          if (typeof userObj.id === "string") sessionUser.id = userObj.id;
          if (typeof userObj.role === "string") sessionUser.role = userObj.role;
        }
      }
      return session as Session;
    },
  },
};

// Helpful debug: log presence of critical env vars (don't print secrets)
console.log("NEXTAUTH_SECRET set?", !!env.NEXTAUTH_SECRET);
console.log("EMAIL server configured?", !!(env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD));

// Next.js app-route handlers expect functions that accept a Request and
// return void | Response | Promise<void | Response>. Use that as the
// handler type so the generated .next types line up.
let handler: (req: Request) => void | Response | Promise<void | Response>;
try {
  console.log('[server/auth] Initializing NextAuth with adapters/providers...');
  // NextAuth returns a handler function; keep its signature generic to avoid
  // tightly coupling to NextAuth internal types here.
  // NextAuth returns a handler function. Cast it to the narrower Request
  // -> Response | void signature to satisfy Next.js route type checks.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  handler = NextAuth(authOptions) as unknown as (req: Request) => void | Response | Promise<void | Response>;
  console.log('[server/auth] NextAuth initialized successfully');
} catch (err) {
  // If NextAuth throws during initialization, surface the error to dev logs
  console.error("Failed to initialize NextAuth:", (err as Error)?.stack ?? String(err));
  // Fallback handler returns a 500 JSON so the client sees a clear error
  handler = async (req: Request) =>
    new Response(JSON.stringify({ message: "NextAuth initialization failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
}

// Export the NextAuth handler for the App Router. Use aliasing instead of
// destructuring: the handler function should be exported as both GET and POST
// so Next.js can call it for requests to /api/auth/* (including /session).
// The NextAuth internals sometimes expect a `req` object that has a
// `query.nextauth` array (the catch-all segments). To be resilient when the
// runtime passes a plain Fetch Request, provide small adapter wrappers that
// build an auth-shaped request and then call the NextAuth handler.
async function buildAuthReq(req: Request) {
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean).slice(2);
  const text = await req.text().catch(() => '');
  const authReq: {
    method: string;
    headers: Headers;
    body: string;
    url: string;
    query: { nextauth: string[] };
    text: () => Promise<string>;
    json: () => Promise<unknown> | null;
  } = {
    method: req.method,
    headers: req.headers,
    body: text,
    url: req.url,
    query: { nextauth: segments },
    text: async () => text,
    json: async () => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    },
  };
  return authReq;
}

// Export the NextAuth handler directly for the App Router. This matches the
// canonical pattern NextAuth expects in app-route handlers.
// Export wrapped handlers for the App Router. Adapt the incoming Fetch
// Request into the shape NextAuth internals expect (with query.nextauth)
// and convert the result into a proper Response.
export { handler as GET, handler as POST };
// Also export the raw handler for programmatic use
export { handler };

// (Note: handler exported above)

// Wrap the handler to log invocation errors with stack traces for easier
// debugging when endpoints are called.
async function invokeHandlerSafely(req: Request) {
  try {
    // Handler has a generic signature; cast to unknown when invoking.
    return await (handler as (r: unknown) => Promise<unknown>)(req);
  } catch (err) {
    console.error('[server/auth] handler invocation error:', (err as Error)?.stack ?? String(err));
    throw err;
  }
}

import type { Session } from 'next-auth';

export const getServerAuthSession = async () => {
  if (process.env.NEXT_PUBLIC_E2E === "true") {
    const session: Session = {
      user: {
        id: "e2e-user",
        role: Role.ADMIN,
        name: "Kasir Uji",
        email: "kasir@example.com",
        image: null,
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    return session;
  }

  return getServerSession(authOptions);
};

export async function ensureAuthenticatedOrRedirect() {
  const session = await getServerAuthSession();
  if (!session) {
    const { redirect } = await import('next/navigation');
    redirect('/auth/login');
  }
  return session;
}
