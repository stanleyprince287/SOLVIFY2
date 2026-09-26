import { z } from 'zod';

const bool = (def: boolean) =>
  z.enum(['true', 'false']).default(String(def) as 'true' | 'false').transform(v => v === 'true');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: bool(false),
  COOKIE_DOMAIN: z.string().optional(),

  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  PLATFORM_CURRENCY: z.string().default('NGN'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  MAX_IMAGE_MB: z.coerce.number().positive().default(5),
  MAX_DOC_MB: z.coerce.number().positive().default(10),

  SEARCH_LOCATION_SCOPE: z.enum(['exact', 'city', 'state', 'off']).default('city'),

  RANK_W_SERVICE: z.coerce.number().default(0.30),
  RANK_W_LOCATION: z.coerce.number().default(0.25),
  RANK_W_VERIFICATION: z.coerce.number().default(0.15),
  RANK_W_RATING: z.coerce.number().default(0.10),
  RANK_W_REVIEWS: z.coerce.number().default(0.05),
  RANK_W_EXPERIENCE: z.coerce.number().default(0.05),
  RANK_W_COMPLETED: z.coerce.number().default(0.05),
  RANK_W_AVAILABILITY: z.coerce.number().default(0.05),

  MAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);