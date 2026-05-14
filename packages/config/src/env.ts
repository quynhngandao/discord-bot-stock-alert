import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  TIINGO_API_KEY: z.string().min(1),
  POLYGON_API_KEY: z.string().min(1),
  FINNHUB_API_KEY: z.string().min(1),
  ALERT_CHANNEL_ID: z.string().min(1),
  DATABASE_URL: z.preprocess((v) => (v === '' ? undefined : v), z.url().optional()),
});

export const validateEnv = (env: NodeJS.Process['env']) => {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'));
    process.exit(1);
  }
  return result.data;
};

export type AppEnv = z.infer<typeof envSchema>;
