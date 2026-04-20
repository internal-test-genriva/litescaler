export interface WPPage {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private';
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  meta?: {
    _yoast_wpseo_title?: string;
    _yoast_wpseo_metadesc?: string;
    _yoast_wpseo_canonical?: string;
    _yoast_wpseo_schema?: string;
    _yoast_wpseo_focuskw?: string;
    _rank_math_title?: string;
    _rank_math_description?: string;
    _rank_math_canonical_url?: string;
    _rank_math_schema?: string;
  };
}

export interface WPPageResponse {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  parent: number;
  menu_order: number;
  comment_status: string;
  ping_status: string;
  meta: Record<string, unknown>;
}

export interface WPPostResponse {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  meta: Record<string, unknown>;
  categories?: number[];
  tags?: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text?: string;
    }>;
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      slug: string;
      taxonomy: string;
    }>>;
    author?: Array<{
      id: number;
      name: string;
      url: string;
      description: string;
      link: string;
      slug: string;
    }>;
  };
}

export interface WPCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

export interface WPTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface Author {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls?: Record<string, string>;
}

export interface BlogPost {
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  seo: SEOData;
  date: string;
  modified: string;
  featuredImage?: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
      alt_text?: string;
    }>;
    'wp:term'?: Array<Array<{
      id: number;
      name: string;
      slug: string;
      taxonomy: string;
    }>>;
  };
}

export interface PageData {
  slug: string;
  title: string;
  content: string;
  seo: SEOData;
  date: string;
  modified: string;
  featuredImage?: string;
  categories?: string[];
  author?: string;
  readingTime?: string;
}

export interface SEOData {
  title: string;
  description: string;
  canonical: string;
  schema: string;
  focusKeyword?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: string;
}

const API_URL = import.meta.env.ASTRO_WP_API_URL;

// If no API URL is provided, the WordPress integration won't work
// This is fine for static builds without a WordPress backend
const isWpConfigured = !!API_URL;

/**
 * Parse SEO data from WordPress page metadata
 * Supports both Yoast SEO and Rank Math SEO formats
 */
function parseSEOData(meta: Record<string, unknown> | undefined): SEOData {
  if (!meta) {
    return {
      title: '',
      description: '',
      canonical: '',
      schema: ''
    };
  }

  // Yoast SEO
  const yoastTitle = meta._yoast_wpseo_title as string | undefined;
  const yoastDesc = meta._yoast_wpseo_metadesc as string | undefined;
  const yoastCanonical = meta._yoast_wpseo_canonical as string | undefined;
  const yoastSchema = meta._yoast_wpseo_schema as string | undefined;

  // Rank Math SEO
  const rankMathTitle = meta._rank_math_title as string | undefined;
  const rankMathDesc = meta._rank_math_description as string | undefined;
  const rankMathCanonical = meta._rank_math_canonical_url as string | undefined;
  const rankMathSchema = meta._rank_math_schema as string | undefined;

  return {
    title: yoastTitle || rankMathTitle || '',
    description: yoastDesc || rankMathDesc || '',
    canonical: yoastCanonical || rankMathCanonical || '',
    schema: yoastSchema || rankMathSchema || ''
  };
}

/**
 * Make a request to the WordPress REST API
 */
async function wpFetch<T>(endpoint: string): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status} ${response.statusText} - ${url}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch all published pages for static path generation
 */
export async function getAllPages(): Promise<WPPageResponse[]> {
  const allPages: WPPageResponse[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await wpFetch<WPPageResponse[]>(
        `/pages?per_page=100&page=${page}&status=publish`
      );
      
      if (response.length === 0) {
        hasMore = false;
      } else {
        allPages.push(...response);
        page++;
        
        // Safety limit
        if (page > 100) {
          hasMore = false;
        }
      }
    } catch {
      hasMore = false;
    }
  }

  return allPages;
}

/**
 * Fetch all published posts for static path generation
 */
export async function getAllPosts(): Promise<WPPostResponse[]> {
  if (!isWpConfigured) {
    return [];
  }
  
  const allPosts: WPPostResponse[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await wpFetch<WPPostResponse[]>(
        `/posts?per_page=100&page=${page}&status=publish&_embed`
      );
      
      if (response.length === 0) {
        hasMore = false;
      } else {
        allPosts.push(...response);
        page++;
        
        // Safety limit
        if (page > 100) {
          hasMore = false;
        }
      }
    } catch {
      hasMore = false;
    }
  }

  return allPosts;
}

/**
 * Fetch a single post by slug
 */
export async function getPostBySlug(slug: string): Promise<WPPostResponse | null> {
  try {
    const encodedSlug = encodeURIComponent(slug);
    const posts = await wpFetch<WPPostResponse[]>(
      `/posts?slug=${encodedSlug}&status=publish&per_page=1&_embed`
    );
    
  if (posts.length === 0) {
    return null;
  }

  return posts[0] ?? null;
} catch (error) {
    console.error(`Error fetching post with slug "${slug}":`, error);
    return null;
  }
}

/**
 * Transform WordPress post data to our BlogPost interface
 */
export function transformPostData(wpPost: WPPostResponse): BlogPost {
  const url = new URL(wpPost.link);
  const path = url.pathname.replace(/^\/blog\/?/, '').replace(/^\//, '').replace(/\/$/, '');

  // Extract featured image from _embedded data
  const featuredImage = wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
                        wpPost._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url ||
                        undefined;

  // Extract categories
  const categories = wpPost._embedded?.['wp:term']?.[0]
    ?.filter((term: any) => term.taxonomy === 'category')
    ?.map((cat: any) => cat.name) || [];

  // Calculate reading time
  const textContent = wpPost.content.rendered.replace(/<[^>]*>/g, '');
  const wordCount = textContent.split(/\s+/).length;
  const readingTime = `${Math.ceil(wordCount / 200)} min read`;

  return {
    slug: path,
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    excerpt: wpPost.excerpt.rendered,
    seo: parseSEOData(wpPost.meta),
    date: wpPost.date,
    modified: wpPost.modified,
    featuredImage,
    _embedded: wpPost._embedded,
    categories,
    readingTime
  };
}

/**
 * Transform WordPress post data to PageData interface for single post view
 */
export function transformPostToPageData(wpPost: WPPostResponse): PageData {
  const url = new URL(wpPost.link);
  const path = url.pathname.replace(/^\/blog\/?/, '').replace(/^\//, '').replace(/\/$/, '');

  // Extract featured image from _embedded data
  const featuredImage = wpPost._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
                        wpPost._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url ||
                        undefined;

  // Extract categories
  const categories = wpPost._embedded?.['wp:term']?.[0]
    ?.filter((term: any) => term.taxonomy === 'category')
    ?.map((cat: any) => cat.name) || [];

  // Extract author name
  const author = wpPost._embedded?.author?.[0]?.name || undefined;

  return {
    slug: path,
    title: wpPost.title.rendered,
    content: wpPost.content.rendered,
    seo: parseSEOData(wpPost.meta),
    date: wpPost.date,
    modified: wpPost.modified,
    featuredImage,
    categories,
    author
  };
}

/**
 * Get all posts formatted for blog listing
 */
export async function getBlogPosts(): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.map(transformPostData);
}

/**
 * Transform WordPress page data to our PageData interface
 */
export function transformPageData(wpPage: WPPageResponse): PageData {
  // Create slug from the link
  const url = new URL(wpPage.link);
  const path = url.pathname.replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);
  const slug = segments.join('/');

  return {
    slug,
    title: wpPage.title.rendered,
    content: wpPage.content.rendered,
    seo: parseSEOData(wpPage.meta),
    date: wpPage.date,
    modified: wpPage.modified
  };
}

/**
 * Build static paths for all pages and posts
 */
export async function getStaticPaths() {
  const pages = await getAllPages();
  const posts = await getAllPosts();
  
  const pagePaths = pages.map((page) => {
    const url = new URL(page.link);
    const path = url.pathname.replace(/\/$/, '');
    const slug = path === '' ? undefined : path;

    return {
      params: { slug: slug || undefined },
      props: { 
        pageData: transformPageData(page),
        type: 'page'
      }
    };
  });

  const postPaths = posts.map((post) => {
    const url = new URL(post.link);
    const path = url.pathname.replace(/^\/blog\/?/, '').replace(/^\//, '').replace(/\/$/, '');
    const slug = path;

    return {
      params: { slug: `blog/${slug}` },
      props: {
        pageData: transformPostToPageData(post),
        type: 'post'
      }
    };
  });

  return [...pagePaths, ...postPaths];
}

/**
 * Extract full slug path from catch-all route params
 */
export function getSlugFromParams(params: { slug?: string | string[] }): string {
  if (!params.slug) {
    return '';
  }

  const slugArray = Array.isArray(params.slug) ? params.slug : [params.slug];
  return slugArray.join('/');
}

/**
 * Fetch all categories from WordPress
 */
export async function getCategories(): Promise<WPCategory[]> {
  if (!isWpConfigured) {
    return [];
  }
  
  const allCategories: WPCategory[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await wpFetch<WPCategory[]>(
        `/categories?per_page=100&page=${page}&hide_empty=false`
      );

      if (response.length === 0) {
        hasMore = false;
      } else {
        allCategories.push(...response);
        page++;

        if (page > 100) {
          hasMore = false;
        }
      }
    } catch {
      hasMore = false;
    }
  }

  return allCategories;
}

/**
 * Fetch all tags from WordPress
 */
export async function getTags(): Promise<WPTag[]> {
  if (!isWpConfigured) {
    return [];
  }
  
  const allTags: WPTag[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await wpFetch<WPTag[]>(
        `/tags?per_page=100&page=${page}&hide_empty=true`
      );

      if (response.length === 0) {
        hasMore = false;
      } else {
        allTags.push(...response);
        page++;

        if (page > 100) {
          hasMore = false;
        }
      }
    } catch {
      hasMore = false;
    }
  }

  return allTags;
}

/**
 * Fetch posts by category
 */
export async function getPostsByCategory(categoryId: number): Promise<BlogPost[]> {
  const posts = await wpFetch<WPPostResponse[]>(
    `/posts?categories=${categoryId}&per_page=10&status=publish`
  );
  return posts.map(transformPostData);
}

/**
 * Fetch posts by tag
 */
export async function getPostsByTag(tagId: number): Promise<BlogPost[]> {
  const posts = await wpFetch<WPPostResponse[]>(
    `/posts?tags=${tagId}&per_page=10&status=publish`
  );
  return posts.map(transformPostData);
}

/**
 * Fetch a category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<WPCategory | null> {
  if (!isWpConfigured) {
    return null;
  }
  
  try {
    const response = await wpFetch<WPCategory[]>(
      `/categories?slug=${encodeURIComponent(slug)}&hide_empty=false`
    );
    return response[0] || null;
  } catch {
    return null;
  }
}

/**
 * Fetch posts by category slug (with full data including _embed)
 */
export async function getPostsByCategorySlug(categorySlug: string): Promise<BlogPost[]> {
  if (!isWpConfigured) {
    return [];
  }
  
  try {
    // First get the category ID from the slug
    const category = await getCategoryBySlug(categorySlug);
    if (!category) return [];

    const posts = await wpFetch<WPPostResponse[]>(
      `/posts?categories=${category.id}&per_page=100&status=publish&_embed`
    );
    return posts.map(transformPostData);
  } catch {
    return [];
  }
}

/**
 * Get all categories with their slugs for static path generation
 */
export async function getAllCategorySlugs(): Promise<string[]> {
  if (!isWpConfigured) {
    return [];
  }
  
  try {
    const categories = await wpFetch<Array<{ slug: string }>>(
      `/categories?per_page=100&hide_empty=false`
    );
    return categories.map(cat => cat.slug);
  } catch {
    return [];
  }
}

/**
 * Fetch author by ID
 */
export async function getAuthorById(authorId: number): Promise<Author | null> {
  try {
    return await wpFetch<Author>(`/users/${authorId}`);
  } catch {
    return null;
  }
}

/**
 * Fetch featured image URL by media ID
 */
export async function getFeaturedImage(mediaId: number): Promise<string | null> {
  try {
    const media = await wpFetch<{ source_url: string }>(`/media/${mediaId}`);
    return media.source_url;
  } catch {
    return null;
  }
}

/**
 * Interface for menu-friendly post data
 */
export interface MenuPost {
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  date: string;
  readingTime?: string;
}

/**
 * Interface for menu-friendly category data
 */
export interface MenuCategory {
  name: string;
  slug: string;
  count: number;
}

/**
 * Fetch recent posts for mega menu (with featured images)
 */
export async function getRecentPostsForMenu(limit: number = 5): Promise<MenuPost[]> {
  try {
    const posts = await wpFetch<WPPostResponse[]>(
      `/posts?per_page=${limit}&status=publish&_embed`
    );

    return posts.map((post) => {
      // Strip HTML from excerpt
      const plainExcerpt = post.excerpt.rendered
        .replace(/<[^>]*>/g, '')
        .replace(/&#8230;/g, '...')
        .replace(/&#8217;/g, "'")
        .slice(0, 100) + '...';

      // Calculate reading time
      const textContent = post.content.rendered.replace(/<[^>]*>/g, '');
      const wordCount = textContent.split(/\s+/).length;
      const readingTime = `${Math.ceil(wordCount / 200)} min read`;

      // Extract slug from the post link properly
      let slug = post.slug;
      if (slug.includes('://') || slug.includes('http')) {
        // If slug contains URL, extract just the path
        try {
          const url = new URL(slug.startsWith('http') ? slug : `https://${slug}`);
          const pathParts = url.pathname.split('/').filter(Boolean);
          slug = pathParts[pathParts.length - 1] || slug;
        } catch (e) {
          // Keep original slug
        }
      }

      return {
        title: post.title.rendered,
        slug: slug,
        excerpt: plainExcerpt,
        featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url,
        date: post.date,
        readingTime
      };
    });
  } catch {
    return [];
  }
}

/**
 * Fetch all categories with post counts for mega menu
 */
export async function getAllCategoriesForMenu(): Promise<MenuCategory[]> {
  try {
    const categories = await wpFetch<Array<{ name: string; slug: string; count: number }>>(
      `/categories?per_page=100&hide_empty=false`
    );

    return categories.map((cat) => ({
      name: cat.name,
      slug: cat.slug,
      count: cat.count
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch all tags for mega menu
 */
export async function getAllTagsForMenu(): Promise<MenuCategory[]> {
  try {
    const tags = await wpFetch<Array<{ name: string; slug: string; count: number }>>(
      `/tags?per_page=50&hide_empty=true`
    );

    return tags.map((tag) => ({
      name: tag.name,
      slug: tag.slug,
      count: tag.count
    }));
  } catch {
    return [];
  }
}

