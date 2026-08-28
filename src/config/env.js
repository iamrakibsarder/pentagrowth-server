import dotenv from "dotenv";

dotenv.config();

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_API_TOKEN"];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Missing ${key}. The API will fail until it is configured.`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  adminApiToken: process.env.ADMIN_API_TOKEN,
  publicSiteUrl: (process.env.PUBLIC_SITE_URL ?? "https://pentagrowth.digital").replace(/\/$/, ""),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  blogImageBucket: process.env.SUPABASE_BLOG_IMAGE_BUCKET ?? "blog-images",
};
