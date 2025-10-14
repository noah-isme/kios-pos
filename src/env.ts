import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1).default("dev-secret"),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  EMAIL_SERVER_HOST: z.string().min(1).optional(),
  EMAIL_SERVER_PORT: z.coerce.number().default(587),
  EMAIL_SERVER_USER: z.string().min(1).optional(),
  EMAIL_SERVER_PASSWORD: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  STORE_NPWP: z.string().optional(),
  DISCOUNT_LIMIT_PERCENT: z
    .coerce
    .number()
    .min(0)
    .max(100)
    .default(50),
});

// Helper: treat empty strings as undefined (helps when env var exists but is empty)
const maybe = (v: string | undefined): string | undefined =>
  v === undefined || v === null || v.trim() === "" ? undefined : v;

const parsed = envSchema.safeParse({
  DATABASE_URL: maybe(process.env.DATABASE_URL),
  SHADOW_DATABASE_URL: maybe(process.env.SHADOW_DATABASE_URL),
  NEXTAUTH_URL: maybe(process.env.NEXTAUTH_URL),
  NEXTAUTH_SECRET: maybe(process.env.NEXTAUTH_SECRET),
  GOOGLE_CLIENT_ID: maybe(process.env.GOOGLE_CLIENT_ID),
  GOOGLE_CLIENT_SECRET: maybe(process.env.GOOGLE_CLIENT_SECRET),
  EMAIL_SERVER_HOST: maybe(process.env.EMAIL_SERVER_HOST),
  EMAIL_SERVER_PORT: maybe(process.env.EMAIL_SERVER_PORT),
  EMAIL_SERVER_USER: maybe(process.env.EMAIL_SERVER_USER),
  EMAIL_SERVER_PASSWORD: maybe(process.env.EMAIL_SERVER_PASSWORD),
  EMAIL_FROM: maybe(process.env.EMAIL_FROM),
  SUPABASE_URL: maybe(process.env.SUPABASE_URL),
  SUPABASE_ANON_KEY: maybe(process.env.SUPABASE_ANON_KEY),
  STORE_NPWP: maybe(process.env.STORE_NPWP),
  DISCOUNT_LIMIT_PERCENT: maybe(process.env.DISCOUNT_LIMIT_PERCENT),
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Missing or invalid environment configuration");
}

export const env = parsed.data;
