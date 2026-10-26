import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CORS_ORIGIN: z.string().default("*"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required").optional(),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long"),
  JWT_EXPIRES_IN: z.string().default("10m"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("10m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("8h"),
  JWT_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(120),
  JWT_MAX_SESSION_HOURS: z.coerce.number().default(8),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  DEFAULT_WHATSAPP_NUMBER: z.string().default("2348000000000"),
  COMPANY_NAME: z.string().default("Elpima Surgicals Limited"),
  COMPANY_EMAIL: z.string().email().optional().default("info@elpimasurgicals.com"),
  COMPANY_PHONE: z.string().optional().default("+2348000000000"),
  COMPANY_ADDRESS: z.string().optional().default("Lagos, Nigeria"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_JWT_AUDIENCE: z.string().optional(),
  SPB_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  SPB_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  SUPABASE_STORAGE_ENDPOINT: z.string().url().optional(),
  SUPABASE_STORAGE_REGION: z.string().optional(),
  SALES_DESK_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const isDev = env.NODE_ENV === "development";
