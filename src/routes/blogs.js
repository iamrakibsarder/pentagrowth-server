import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
import { asyncHandler, HttpError, isAdminRequest, requireAdmin } from "../lib/http.js";
import {
  estimateReadingTime,
  htmlToBlocks,
  makeSlug,
  markdownToHtml,
  parseNotionExport,
  sanitizeBlogHtml,
  toApiBlog,
} from "../lib/blog-content.js";
import { blogInputSchema } from "../lib/validators.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const blogsRouter = Router();

function parseTags(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return fallback;
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readFrontmatter(frontmatter, ...keys) {
  for (const key of keys) {
    if (frontmatter[key] !== undefined && frontmatter[key] !== "") return frontmatter[key];
  }
  return null;
}

function normalizeText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();
}

function stripDuplicateMarkdownTitle(markdown = "", title = "") {
  if (!markdown || !title) return markdown;

  return String(markdown).replace(/^\s*#\s+(.+?)(?:\r?\n)+/, (match, heading) =>
    normalizeText(heading) === normalizeText(title) ? "" : match,
  );
}

function stripDuplicateHtmlTitle(html = "", title = "") {
  if (!html || !title) return html;

  return String(html).replace(/^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/i, (match, heading) => {
    const plainHeading = heading.replace(/<[^>]*>/g, "");
    return normalizeText(plainHeading) === normalizeText(title) ? "" : match;
  });
}

async function ensureUniqueSlug(baseSlug, { postId, explicitSlug }) {
  const slug = makeSlug(baseSlug);
  if (!slug) throw new HttpError(400, "A valid slug could not be generated from the title.");

  let query = supabase.from("blog_posts").select("id, slug").eq("slug", slug).limit(1);
  if (postId) query = query.neq("id", postId);

  const { data: existing, error } = await query.maybeSingle();
  if (error) throw new HttpError(500, "Unable to validate slug.", error);

  if (!existing) return slug;
  if (explicitSlug) throw new HttpError(409, "That slug is already used by another blog post.");

  for (let suffix = 2; suffix <= 100; suffix += 1) {
    const candidate = `${slug}-${suffix}`;
    let candidateQuery = supabase.from("blog_posts").select("id").eq("slug", candidate).limit(1);
    if (postId) candidateQuery = candidateQuery.neq("id", postId);

    const { data: candidateExisting, error: candidateError } = await candidateQuery.maybeSingle();
    if (candidateError) throw new HttpError(500, "Unable to validate slug.", candidateError);
    if (!candidateExisting) return candidate;
  }

  throw new HttpError(409, "Too many blog posts share this title. Please enter a custom slug.");
}

export async function mapBlogInput(input, options = {}) {
  const parsed = blogInputSchema.parse(input);
  const contentMarkdown = stripDuplicateMarkdownTitle(parsed.contentMarkdown ?? "", parsed.title) || null;
  const rawContentHtml = stripDuplicateHtmlTitle(parsed.contentHtml ?? "", parsed.title) || null;
  const explicitSlug = Boolean(parsed.slug);
  const slug = await ensureUniqueSlug(parsed.slug ?? parsed.title, {
    postId: options.postId,
    explicitSlug,
  });
  const contentHtml = rawContentHtml
    ? sanitizeBlogHtml(rawContentHtml)
    : contentMarkdown
      ? markdownToHtml(contentMarkdown)
      : null;
  const contentBlocks = parsed.contentBlocks.length ? parsed.contentBlocks : htmlToBlocks(contentHtml ?? "");

  return {
    title: parsed.title,
    slug,
    excerpt: parsed.excerpt,
    category: parsed.category,
    tags: parsed.tags,
    author_name: parsed.authorName,
    author_image_url: parsed.authorImageUrl,
    status: parsed.status,
    featured: parsed.featured,
    feature_image_url: parsed.featureImageUrl,
    feature_image_alt: parsed.featureImageAlt,
    content_markdown: contentMarkdown,
    content_html: contentHtml,
    content_blocks: contentBlocks,
    meta_title: parsed.metaTitle || parsed.title,
    meta_description: parsed.metaDescription || parsed.excerpt,
    canonical_url: parsed.canonicalUrl,
    og_title: parsed.ogTitle || parsed.metaTitle || parsed.title,
    og_description: parsed.ogDescription || parsed.metaDescription || parsed.excerpt,
    focus_keyword: parsed.focusKeyword,
    aeo_summary: parsed.aeoSummary || parsed.excerpt,
    faq: parsed.faq,
    reading_time_minutes: estimateReadingTime(contentMarkdown ?? contentHtml ?? parsed.excerpt ?? ""),
    published_at: parsed.status === "published" ? parsed.publishedAt ?? new Date().toISOString() : parsed.publishedAt,
  };
}

function getStorageImageUrl(pathOrUrl) {
  if (!pathOrUrl || /^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data } = supabase.storage.from(env.blogImageBucket).getPublicUrl(pathOrUrl);
  return data.publicUrl;
}

function resolveBlogImages(blog) {
  const image = getStorageImageUrl(blog.image);
  return {
    ...blog,
    image,
    mainImage: image,
  };
}

async function listStorageImages(prefix = "", depth = 0) {
  if (depth > 4) return [];

  const { data, error } = await supabase.storage.from(env.blogImageBucket).list(prefix, {
    limit: 200,
    offset: 0,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) throw new HttpError(500, "Unable to fetch blog images.", error);

  const images = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    const isFolder = !item.id && !item.metadata?.mimetype;

    if (isFolder) {
      images.push(...(await listStorageImages(path, depth + 1)));
      continue;
    }

    if (!item.name || !/\.(avif|gif|jpe?g|png|svg|webp)$/i.test(item.name)) continue;

    images.push({
      name: item.name,
      path,
      url: getStorageImageUrl(path),
      size: item.metadata?.size ?? null,
      createdAt: item.created_at ?? null,
      updatedAt: item.updated_at ?? null,
    });
  }

  return images;
}

blogsRouter.get(
  "/admin/blogs/images",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const images = await listStorageImages();
    res.json({ images });
  }),
);

blogsRouter.get(
  "/blogs",
  asyncHandler(async (req, res) => {
    const includeDrafts = req.query.includeDrafts === "true";
    if (includeDrafts && !isAdminRequest(req)) {
      throw new HttpError(401, "Admin authentication required to list drafts.");
    }

    let query = supabase
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!includeDrafts) query = query.eq("status", "published");
    if (req.query.category) query = query.eq("category", req.query.category);

    const { data, error } = await query;
    if (error) throw new HttpError(500, "Unable to fetch blogs.", error);

    const blogs = (data ?? []).map((row) => resolveBlogImages(toApiBlog(row)));
    res.json({ blogs });
  }),
);

blogsRouter.get(
  "/blogs/:slug",
  asyncHandler(async (req, res) => {
    const includeDrafts = req.query.preview === "true";
    let query = supabase.from("blog_posts").select("*").eq("slug", req.params.slug).limit(1);
    if (!includeDrafts) query = query.eq("status", "published");

    const { data, error } = await query.single();
    if (error) throw new HttpError(error.code === "PGRST116" ? 404 : 500, "Blog post not found.", error);

    const blog = resolveBlogImages(toApiBlog(data));
    const relatedQuery = supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .neq("slug", req.params.slug)
      .limit(3);

    const { data: relatedData } = await relatedQuery;
    const relatedPosts = (relatedData ?? []).map((row) => resolveBlogImages(toApiBlog(row)));

    res.json({ blog, relatedPosts });
  }),
);

blogsRouter.post(
  "/admin/blogs",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = await mapBlogInput(req.body);
    const { data, error } = await supabase.from("blog_posts").insert(payload).select("*").single();
    if (error) throw new HttpError(400, "Unable to create blog post.", error);
    res.status(201).json({ blog: resolveBlogImages(toApiBlog(data)) });
  }),
);

blogsRouter.put(
  "/admin/blogs/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = await mapBlogInput(req.body, { postId: req.params.id });
    const { data, error } = await supabase.from("blog_posts").update(payload).eq("id", req.params.id).select("*").single();
    if (error) throw new HttpError(400, "Unable to update blog post.", error);
    res.json({ blog: resolveBlogImages(toApiBlog(data)) });
  }),
);

blogsRouter.delete(
  "/admin/blogs/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", req.params.id);
    if (error) throw new HttpError(400, "Unable to delete blog post.", error);
    res.status(204).send();
  }),
);

blogsRouter.post(
  "/admin/blogs/upload-image",
  requireAdmin,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "Image file is required.");

    const extension = req.file.originalname.split(".").pop()?.toLowerCase() ?? "webp";
    const path = `features/${Date.now()}-${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(env.blogImageBucket).upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) throw new HttpError(400, "Unable to upload feature image.", error);

    res.status(201).json({ path, url: getStorageImageUrl(path) });
  }),
);

blogsRouter.post(
  "/admin/blogs/import-notion",
  requireAdmin,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "featureImage", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const notionFile = req.files?.file?.[0];
    if (!notionFile) throw new HttpError(400, "Notion Markdown or HTML export is required.");

    const parsed = parseNotionExport(notionFile.buffer, notionFile.originalname);
    let featureImageUrl =
      req.body.featureImageUrl || readFrontmatter(parsed.frontmatter, "featureImageUrl", "feature_image_url") || null;

    const featureImage = req.files?.featureImage?.[0];
    if (featureImage) {
      const extension = featureImage.originalname.split(".").pop()?.toLowerCase() ?? "webp";
      const path = `features/${parsed.slug}-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from(env.blogImageBucket).upload(path, featureImage.buffer, {
        contentType: featureImage.mimetype,
        upsert: false,
      });
      if (error) throw new HttpError(400, "Unable to upload feature image.", error);
      featureImageUrl = path;
    }

    const payload = await mapBlogInput({
      title: req.body.title || readFrontmatter(parsed.frontmatter, "title", "post_title", "postTitle") || parsed.title,
      slug: req.body.slug || parsed.frontmatter.slug || parsed.slug,
      excerpt: req.body.excerpt || parsed.frontmatter.excerpt || parsed.frontmatter.description || null,
      category: req.body.category || parsed.frontmatter.category || "Insights",
      tags: parseTags(req.body.tags, Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : []),
      authorName: req.body.authorName || parsed.frontmatter.author || "Pentagrowth Digital",
      status: req.body.status || parsed.frontmatter.status || "draft",
      featured: req.body.featured === "true" || parsed.frontmatter.featured === true,
      featureImageUrl,
      featureImageAlt: req.body.featureImageAlt || readFrontmatter(parsed.frontmatter, "featureImageAlt", "feature_image_alt") || parsed.title,
      contentMarkdown: parsed.markdown,
      contentHtml: parsed.html,
      contentBlocks: parsed.blocks,
      metaTitle: req.body.metaTitle || readFrontmatter(parsed.frontmatter, "metaTitle", "meta_title") || parsed.title,
      metaDescription: req.body.metaDescription || readFrontmatter(parsed.frontmatter, "metaDescription", "meta_description", "description") || null,
      canonicalUrl: req.body.canonicalUrl || readFrontmatter(parsed.frontmatter, "canonicalUrl", "canonical_url") || null,
      ogTitle: req.body.ogTitle || readFrontmatter(parsed.frontmatter, "ogTitle", "og_title") || parsed.title,
      ogDescription: req.body.ogDescription || readFrontmatter(parsed.frontmatter, "ogDescription", "og_description", "description") || null,
      focusKeyword: req.body.focusKeyword || readFrontmatter(parsed.frontmatter, "focusKeyword", "focus_keyword") || null,
      aeoSummary: req.body.aeoSummary || readFrontmatter(parsed.frontmatter, "aeoSummary", "aeo_summary", "answerEngineSummary", "answer_engine_summary", "description") || null,
      faq: Array.isArray(parsed.frontmatter.faq) ? parsed.frontmatter.faq : [],
    });

    const { data, error } = await supabase.from("blog_posts").insert(payload).select("*").single();
    if (error) throw new HttpError(400, "Unable to import Notion export.", error);
    res.status(201).json({ blog: resolveBlogImages(toApiBlog(data)) });
  }),
);
