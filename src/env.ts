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
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Missing or invalid environment configuration");
}

export const env = parsed.data;
