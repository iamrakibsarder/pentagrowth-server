import { Router } from "express";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
import { asyncHandler, HttpError } from "../lib/http.js";

export const seoRouter = Router();

seoRouter.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const staticPaths = ["", "/blog", "/services", "/projects", "/contact"];
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) throw new HttpError(500, "Unable to build sitemap.", error);

    const urls = [
      ...staticPaths.map((path) => ({ loc: `${env.publicSiteUrl}${path}`, lastmod: new Date().toISOString() })),
      ...(data ?? []).map((post) => ({
        loc: `${env.publicSiteUrl}/blog/${post.slug}`,
        lastmod: post.updated_at ?? post.published_at ?? new Date().toISOString(),
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${url.loc}</loc><lastmod>${new Date(url.lastmod).toISOString()}</lastmod></url>`)
      .join("\n")}\n</urlset>`;

    res.type("application/xml").send(xml);
  }),
);

seoRouter.get("/robots.txt", (_req, res) => {
  res
    .type("text/plain")
    .send(`User-agent: *\nAllow: /\nSitemap: ${env.publicSiteUrl}/sitemap.xml\n`);
});
