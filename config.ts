import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  ZZER_AUTH_TOKEN: z.string().min(1),
  ZZER_API_BASE_URL: z.string().url().default('https://gwapi-v2.goshare2.com'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  LOG_LEVEL: z.string().default('info'),
  ZZER_PRODUCT_ID: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function getConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parsed.data;
}
