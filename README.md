# Pentagrowth Server

Express API for Pentagrowth blog publishing, Notion export imports, image uploads, contact leads, dynamic SEO metadata, sitemap, and robots output.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create a public-read Storage bucket named `blog-images`. Uploads still go through the authenticated server API.
4. Copy `.env.example` to `.env` and fill in the values.
5. Install and run:

```bash
npm install
npm run dev
```

## Frontend environment

Add this to the Next app:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
PENTAGROWTH_ADMIN_API_TOKEN=replace-with-the-same-token
NEXT_PUBLIC_SITE_URL=https://pentagrowth.digital
```

For production, set `NEXT_PUBLIC_API_BASE_URL` to the deployed API origin.

## Notion import

Export a Notion page as Markdown or HTML and upload it to `POST /api/admin/blogs/import-notion`.
Markdown frontmatter is supported:

```markdown
---
title: My Blog Title
slug: my-blog-title
category: SEO
excerpt: A short search-friendly summary.
tags:
  - SEO
  - AEO
status: draft
---
```

The API stores sanitized HTML, structured content blocks, metadata fields, and optional uploaded feature image URLs.
