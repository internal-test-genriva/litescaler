export interface PayloadPost {
  id: number;
  title: string;
  slug: string;
  content: any; // Lexical JSON
  excerpt: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  featuredImage?: {
    url: string;
    alt?: string;
  };
  author?: Array<{
    id: number;
    name?: string;
  }>;
  category?: Array<{
    id: number;
    title: string;
    slug: string;
  }>;
  tags?: Array<{
    id: number;
    title: string;
    slug: string;
  }>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}

export interface BlogPost {
  slug: string;
  title: string;
  content: string; // HTML string
  excerpt: string;
  date: string;
  modified: string;
  featuredImage?: string;
  categories: string[];
  readingTime?: string;
  seo?: any;
}

export interface PageData {
  slug: string;
  title: string;
  content: string;
  seo: any;
  date: string;
  modified: string;
  featuredImage?: string;
  categories?: string[];
  author?: string;
}

const API_URL = import.meta.env.PAYLOAD_POSTS_API_URL;
const PAYLOAD_SERVER_URL = import.meta.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://payload.litescaler.work';

function getFullUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${PAYLOAD_SERVER_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Convert Lexical JSON to HTML
 */
export function lexicalToHtml(json: any): string {
  if (!json || !json.root || !json.root.children) return '';

  function renderNode(node: any): string {
    if (node.type === 'text') {
      let text = node.text || '';
      if (node.format & 1) text = `<strong>${text}</strong>`; // Bold
      if (node.format & 2) text = `<em>${text}</em>`;   // Italic
      if (node.format & 4) text = `<strike>${text}</strike>`; // Strikethrough
      if (node.format & 8) text = `<code>${text}</code>`;   // Code
      return text;
    }

    const children = node.children ? node.children.map(renderNode).join('') : '';

    switch (node.type) {
      case 'root':
        return children;
      case 'paragraph':
        return `<p>${children}</p>`;
      case 'heading':
        return `<${node.tag}>${children}</${node.tag}>`;
      case 'list':
        return `<${node.listType === 'number' ? 'ol' : 'ul'}>${children}</${node.listType === 'number' ? 'ol' : 'ul'}>`;
      case 'listitem':
        return `<li>${children}</li>`;
      case 'link':
        const target = node.fields?.newTab ? ' target="_blank"' : '';
        return `<a href="${node.fields?.url || '#'}"${target}>${children}</a>`;
      case 'quote':
        return `<blockquote>${children}</blockquote>`;
      case 'upload':
        if (node.value && node.value.url) {
          return `<figure><img src="${getFullUrl(node.value.url)}" alt="${node.value.alt || ''}" />${node.value.caption ? `<figcaption>${node.value.caption}</figcaption>` : ''}</figure>`;
        }
        return '';
      case 'table':
        return `<table><tbody>${children}</tbody></table>`;
      case 'tablerow':
        return `<tr>${children}</tr>`;
      case 'tablecell':
        return `<td>${children}</td>`;
      case 'horizontalrule':
        return '<hr />';
      default:
        // Handle line breaks if they exist as separate nodes or just return children
        return children;
    }
  }

  return renderNode(json.root);
}

/**
 * Transform Payload Post to our internal BlogPost format
 */
export function transformPost(post: PayloadPost): BlogPost {
  // Extract categories
  const categories = post.category?.map(c => c.title) || [];
  
  // Calculate reading time roughly if not provided
  let readingTime = '5 min read';
  if (post.content) {
    const text = JSON.stringify(post.content).replace(/<[^>]*>/g, '');
    const words = text.split(/\s+/).length;
    readingTime = `${Math.ceil(words / 200)} min read`;
  }

  return {
    slug: post.slug,
    title: post.title,
    content: lexicalToHtml(post.content),
    excerpt: post.excerpt || '',
    date: post.publishedAt || post.createdAt,
    modified: post.updatedAt,
    featuredImage: getFullUrl(post.featuredImage?.url),
    categories,
    readingTime,
    seo: {
      title: post.seo?.metaTitle || post.title,
      description: post.seo?.metaDescription || post.excerpt
    }
  };
}

// In-process cache: each build / dev session only hits the slow upstream once.
let _postsCache: Promise<BlogPost[]> | null = null;
let _categoriesCache: Promise<any[]> | null = null;
let _tagsCache: Promise<any[]> | null = null;

/**
 * Fetch all posts from Payload
 */
export function getBlogPosts(): Promise<BlogPost[]> {
  if (_postsCache) return _postsCache;
  _postsCache = (async () => {
    try {
      const response = await fetch(`${API_URL}?limit=1000&depth=1`);
      if (!response.ok) throw new Error(`Payload API error: ${response.status}`);
      const data = await response.json();
      const docs = data.docs || [];
      return docs.map(transformPost);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      _postsCache = null;
      return [];
    }
  })();
  return _postsCache;
}

/**
 * Fetch a single post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  // If the full post list is already in memory, reuse it instead of hitting the API again.
  if (_postsCache) {
    const all = await _postsCache;
    return all.find(p => p.slug === slug) ?? null;
  }
  try {
    const url = `${API_URL}?where[slug][equals]=${slug}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Payload API error: ${response.status}`);
    const data = await response.json();
    const docs = data.docs || [];
    if (docs.length > 0) {
      return transformPost(docs[0]);
    }
    return null;
  } catch (error) {
    console.error(`Error fetching post with slug "${slug}":`, error);
    return null;
  }
}

/**
 * Fetch all categories
 */
export function getCategories() {
  if (_categoriesCache) return _categoriesCache;
  _categoriesCache = (async () => {
    try {
      const catUrl = `${API_URL.replace('/posts', '/categories')}?limit=1000`;
      const response = await fetch(catUrl);
      const data = await response.json();
      const docs = data.docs || [];
      return docs.map((c: any) => ({
        id: c.id,
        name: c.title,
        slug: c.slug,
        count: 0
      }));
    } catch {
      _categoriesCache = null;
      return [];
    }
  })();
  return _categoriesCache;
}

/**
 * Fetch all tags
 */
export function getTags() {
  if (_tagsCache) return _tagsCache;
  _tagsCache = (async () => {
    try {
      const tagUrl = `${API_URL.replace('/posts', '/tags')}?limit=1000`;
      const response = await fetch(tagUrl);
      const data = await response.json();
      const docs = data.docs || [];
      return docs.map((t: any) => ({
        id: t.id,
        name: t.title,
        slug: t.slug,
        count: 0
      }));
    } catch {
      _tagsCache = null;
      return [];
    }
  })();
  return _tagsCache;
}

/**
 * Fetch posts by category slug
 */
export async function getPostsByCategorySlug(categorySlug: string): Promise<BlogPost[]> {
  try {
    const url = `${API_URL}?where[category.slug][equals]=${categorySlug}&limit=1000`;
    const response = await fetch(url);
    const data = await response.json();
    const docs = data.docs || [];
    return docs.map(transformPost);
  } catch {
    return [];
  }
}




/**
 * Static paths helper
 */
export async function getStaticPaths() {
  const posts = await getBlogPosts();
  
  return posts.map(post => ({
    params: { slug: `blog/${post.slug}` },
    props: {
      pageData: {
        slug: post.slug,
        title: post.title,
        content: post.content,
        seo: post.seo,
        date: post.date,
        modified: post.modified,
        featuredImage: post.featuredImage,
        categories: post.categories
      } as PageData,
      type: 'post'
    }
  }));
}
