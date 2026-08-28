import dotenv from "dotenv";

dotenv.config();

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ADMIN_API_TOKEN"];

function normalizeUrl(value) {
  if (!value) return undefined;

  const trimmed = value
    .trim()
    .replace(/\\:/g, ":")
    .replace(/\\\//g, "/");
  const markdownMatch = trimmed.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  const candidate = markdownMatch ? markdownMatch[2] : trimmed;

  try {
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

function normalizeCorsOrigins(value) {
  return (value ?? "http://localhost:3000")
    .split(",")
    .map((origin) => normalizeUrl(origin))
    .filter(Boolean);
}

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Missing ${key}. The API will fail until it is configured.`);
  }
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "127.0.0.1",
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigins: normalizeCorsOrigins(process.env.CORS_ORIGINS),
  adminApiToken: process.env.ADMIN_API_TOKEN,
  publicSiteUrl: normalizeUrl(process.env.PUBLIC_SITE_URL) ?? "https://pentagrowth.digital",
  supabaseUrl: normalizeUrl(process.env.SUPABASE_URL),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  blogImageBucket: process.env.SUPABASE_BLOG_IMAGE_BUCKET ?? "blog-images",
};
