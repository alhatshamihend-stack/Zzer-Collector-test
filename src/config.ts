import 'dotenv/config';
import { z } from 'zod';

const scraperEnvSchema = z.object({
  ZZER_AUTH_TOKEN: z.string().min(1),
  ZZER_API_BASE_URL: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().url().default('https://gwapi-v2.goshare2.com'),
  ),
  LOG_LEVEL: z.string().default('info'),
  ZZER_PRODUCT_ID: z.string().optional(),
});

const envSchema = scraperEnvSchema.extend({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
});

export type ScraperConfig = z.infer<typeof scraperEnvSchema>;
export type AppConfig = z.infer<typeof envSchema>;

function parseEnvironment<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return parsed.data;
}

export function getScraperConfig(): ScraperConfig {
  return parseEnvironment(scraperEnvSchema);
}

export function getConfig(): AppConfig {
  return parseEnvironment(envSchema);
}
