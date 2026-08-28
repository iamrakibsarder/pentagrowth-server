import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import slugify from "slugify";

const WORDS_PER_MINUTE = 225;

const sanitizerConfig = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3"]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

export function makeSlug(value) {
  return slugify(value ?? "", {
    lower: true,
    strict: true,
    trim: true,
  });
}

export function estimateReadingTime(input = "") {
  const words = String(input).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function markdownToHtml(markdown = "") {
  return sanitizeHtml(marked.parse(markdown, { async: false }), sanitizerConfig);
}

export function htmlToBlocks(html = "") {
  const blocks = [];
  const pattern = /<(h2|h3|p|blockquote|li|img)\b([^>]*)>([\s\S]*?)<\/\1>|<img\b([^>]*)\/?>/gi;
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const match of html.matchAll(pattern)) {
    const tag = (match[1] ?? "img").toLowerCase();
    const attrs = match[2] ?? match[4] ?? "";
    const rawText = match[3] ?? "";
    const text = sanitizeHtml(rawText, { allowedTags: [], allowedAttributes: {} }).trim();

    if (tag !== "li") flushList();

    if ((tag === "h2" || tag === "h3") && text) {
      blocks.push({ type: tag === "h2" ? "heading2" : "heading3", text });
    } else if (tag === "p" && text) {
      blocks.push({ type: "paragraph", text });
    } else if (tag === "blockquote" && text) {
      blocks.push({ type: "blockquote", text });
    } else if (tag === "li" && text) {
      listItems.push(text);
    } else if (tag === "img") {
      const src = attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      const alt = attrs.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
      if (src) blocks.push({ type: "image", src, alt });
    }
  }

  flushList();
  return blocks;
}

export function parseNotionExport(buffer, originalName = "notion-export.md") {
  const source = buffer.toString("utf8");
  const isHtml = /\.html?$/i.test(originalName);
  const parsed = isHtml ? { data: {}, content: source } : matter(source);
  const contentHtml = isHtml ? sanitizeHtml(parsed.content, sanitizerConfig) : markdownToHtml(parsed.content);
  const titleFromHeading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = parsed.data.title ?? titleFromHeading ?? originalName.replace(/\.[^.]+$/, "");

  return {
    frontmatter: parsed.data,
    title,
    slug: makeSlug(parsed.data.slug ?? title),
    markdown: isHtml ? null : parsed.content,
    html: contentHtml,
    blocks: htmlToBlocks(contentHtml),
    readingTimeMinutes: estimateReadingTime(parsed.content),
  };
}

export function toApiBlog(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    category: row.category,
    tags: row.tags ?? [],
    author: {
      name: row.author_name,
      image: row.author_image_url,
    },
    status: row.status,
    featured: row.featured,
    image: row.feature_image_url,
    featureImageAlt: row.feature_image_alt,
    mainImage: row.feature_image_url,
    contentMarkdown: row.content_markdown,
    contentHtml: row.content_html,
    content: row.content_blocks ?? [],
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    ogTitle: row.og_title,
    ogDescription: row.og_description,
    focusKeyword: row.focus_keyword,
    aeoSummary: row.aeo_summary,
    faq: row.faq ?? [],
    readingTime: `${row.reading_time_minutes ?? 1} min read`,
    readingTimeMinutes: row.reading_time_minutes ?? 1,
    views: row.views ?? 0,
    date: row.published_at
      ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(row.published_at))
      : null,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
