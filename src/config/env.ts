import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_GUILD_ID: z.string().min(1),
  FINNHUB_API_KEY: z.string().min(1),
  FMP_API_KEY: z.string().min(1),
  ALERT_CHANNEL_ID: z.string().min(1),
  DATABASE_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

export const env = result.data;
