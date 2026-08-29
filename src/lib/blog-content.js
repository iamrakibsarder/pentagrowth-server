import matter from "gray-matter";
import { marked } from "marked";
import slugify from "slugify";

const WORDS_PER_MINUTE = 225;
const allowedTags = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);
const voidTags = new Set(["br", "hr", "img"]);
const allowedAttributes = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
};

function escapeAttribute(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isSafeUrl(value = "") {
  const url = String(value).trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
  if (!url) return false;
  return /^(https?:|mailto:|\/(?!\/)|#)/i.test(url);
}

function stripHtml(html = "") {
  return String(html).replace(/<[^>]*>/g, "");
}

function sanitizeAttributes(tag, attrs = "") {
  const allowedForTag = allowedAttributes[tag];
  if (!allowedForTag) return "";

  const safeAttrs = [];
  const attrPattern = /([a-zA-Z0-9:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>/=`]+)))?/g;

  for (const match of attrs.matchAll(attrPattern)) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (!allowedForTag.has(name) || name.startsWith("on")) continue;
    if ((name === "href" || name === "src") && !isSafeUrl(value)) continue;
    safeAttrs.push(`${name}="${escapeAttribute(value)}"`);
  }

  if (tag === "a") {
    const hasTargetBlank = safeAttrs.some((attr) => attr === 'target="_blank"');
    if (hasTargetBlank && !safeAttrs.some((attr) => attr.startsWith("rel="))) {
      safeAttrs.push('rel="noopener noreferrer"');
    }
  }

  if (tag === "img" && !safeAttrs.some((attr) => attr.startsWith("loading="))) {
    safeAttrs.push('loading="lazy"');
  }

  return safeAttrs.length ? ` ${safeAttrs.join(" ")}` : "";
}

export function sanitizeBlogHtml(html = "") {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|select|textarea|link|meta|base)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form|input|button|select|textarea|link|meta|base)\b[^>]*\/?>/gi, "")
    .replace(/<\/?([a-zA-Z0-9]+)\b([^>]*)>/g, (full, rawTag, attrs) => {
      const tag = rawTag.toLowerCase();
      const isClosing = full.startsWith("</");

      if (!allowedTags.has(tag)) return "";
      if (isClosing) return voidTags.has(tag) ? "" : `</${tag}>`;

      const safeAttrs = sanitizeAttributes(tag, attrs);
      return voidTags.has(tag) ? `<${tag}${safeAttrs}>` : `<${tag}${safeAttrs}>`;
    });
}

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
  return sanitizeBlogHtml(marked.parse(markdown, { async: false }));
}

function stripLeadingTitleHeading(markdown = "") {
  return String(markdown).replace(/^\s*#\s+.+(?:\r?\n)+/, "");
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
    const text = stripHtml(rawText).trim();

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
  const titleFromHeading = parsed.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = parsed.data.title ?? parsed.data.post_title ?? parsed.data.postTitle ?? titleFromHeading ?? originalName.replace(/\.[^.]+$/, "");
  const content = isHtml ? parsed.content : stripLeadingTitleHeading(parsed.content);
  const contentHtml = isHtml ? sanitizeBlogHtml(content) : markdownToHtml(content);

  return {
    frontmatter: parsed.data,
    title,
    slug: makeSlug(parsed.data.slug ?? title),
    markdown: isHtml ? null : content,
    html: contentHtml,
    blocks: htmlToBlocks(contentHtml),
    readingTimeMinutes: estimateReadingTime(content),
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
