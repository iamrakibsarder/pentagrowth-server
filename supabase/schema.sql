create extension if not exists pgcrypto;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  category text,
  tags text[] not null default '{}',
  author_name text not null default 'Pentagrowth Digital',
  author_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  feature_image_url text,
  feature_image_alt text,
  content_markdown text,
  content_html text,
  content_blocks jsonb not null default '[]'::jsonb,
  meta_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  focus_keyword text,
  aeo_summary text,
  faq jsonb not null default '[]'::jsonb,
  reading_time_minutes integer not null default 1,
  views integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_published_at_idx
  on public.blog_posts (status, published_at desc);

create index if not exists blog_posts_featured_idx
  on public.blog_posts (featured)
  where status = 'published';

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  budget text,
  source text,
  project_details text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_blog_posts_updated_at on public.blog_posts;
create trigger set_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;
alter table public.contact_submissions enable row level security;

drop policy if exists "Published blog posts are public" on public.blog_posts;
create policy "Published blog posts are public"
on public.blog_posts
for select
using (status = 'published');

drop policy if exists "Contact submissions are service role only" on public.contact_submissions;

-- Blog thumbnails are public marketing assets. Keep writes server-only, but make
-- reads public so Open Graph, search, and answer-engine crawlers get stable URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do nothing;
