import { z } from "zod";

const nullableString = z.string().trim().nullable().optional();

export const blogInputSchema = z.object({
  title: z.string().trim().min(3),
  slug: z.string().trim().min(3).optional(),
  excerpt: nullableString,
  category: nullableString,
  tags: z.array(z.string().trim().min(1)).default([]),
  authorName: z.string().trim().min(1).default("Pentagrowth Digital"),
  authorImageUrl: nullableString,
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  featured: z.boolean().default(false),
  featureImageUrl: nullableString,
  featureImageAlt: nullableString,
  contentMarkdown: nullableString,
  contentHtml: nullableString,
  contentBlocks: z.array(z.record(z.string(), z.any())).default([]),
  metaTitle: nullableString,
  metaDescription: nullableString,
  canonicalUrl: nullableString,
  ogTitle: nullableString,
  ogDescription: nullableString,
  focusKeyword: nullableString,
  aeoSummary: nullableString,
  faq: z.array(z.record(z.string(), z.any())).default([]),
  publishedAt: nullableString,
});

export const contactInputSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: nullableString,
  budget: nullableString,
  source: nullableString,
  projectDetails: z.string().trim().min(10),
});
