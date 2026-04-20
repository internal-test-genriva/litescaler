# Astro + Headless WordPress

A production-grade static website template built with Astro and a headless WordPress backend.

## Features

- **Static Site Generation (SSG)** - Pre-rendered HTML for optimal performance
- **Headless WordPress** - WordPress as CMS only, Astro handles rendering
- **SEO First** - All SEO metadata managed in WordPress, injected directly into pages
- **Nested Routing** - Support for deeply nested page structures
- **TypeScript** - Full type safety for maintainable code
- **Zero Client JS** - No client-side JavaScript unless explicitly needed

## Project Structure

```
src/
├── components/
│   ├── Header.astro      # Site header with navigation
│   └── Footer.astro      # Site footer
├── layouts/
│   ├── BaseLayout.astro  # Main layout with SEO injection
│   └── Layout.astro      # Simple layout wrapper
├── lib/
│   └── wp.ts             # WordPress API utilities
├── pages/
│   ├── [...slug].astro   # Dynamic catch-all route
│   └── index.astro       # Home page
└── styles/
    └── global.css        # Global styles
```

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure WordPress API**

   Copy `.env.example` to `.env` and set your WordPress API URL:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```env
   ASTRO_WP_API_URL=https://your-wordpress-site.com/wp-json/wp/v2
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Build for production**

   ```bash
   npm run build
   ```

## WordPress Requirements

- WordPress 5.0+ with REST API enabled (default)
- SEO plugin installed:
  - Yoast SEO, or
  - Rank Math SEO

## Routing

All pages are generated dynamically using `getStaticPaths()`. Routes are derived directly from WordPress slugs.

Examples:
- `/` → WordPress home page
- `/about` → WordPress page with slug "about"
- `/services/seo` → WordPress page with slug "services/seo"

## SEO Handling

**Critical Rule**: Astro never calculates or modifies SEO data.

SEO metadata is:
1. Fetched from WordPress via REST API
2. Injected directly into the `<head>` as raw HTML
3. Supports Yoast SEO and Rank Math SEO schemas

Astro components do NOT include:
- Title tag generation
- Meta description creation
- Canonical URL calculation
- Schema markup generation

## Customization

### Adding Components

Create components in `src/components/` and import them into your layouts or pages.

### Styling

- Global styles: `src/styles/global.css`
- Component styles: Scoped `<style>` blocks in Astro components
- No CSS frameworks included by default (bring your own)

### API Extensions

Modify `src/lib/wp.ts` to:
- Add custom WordPress API endpoints
- Handle additional post types
- Add caching logic

## Python Integration

A Python integration component is available that runs at build time.

### Setup

Ensure you have `python3` installed and available in your system PATH.

### Usage

The `PythonIntegration` component is located at `src/components/PythonIntegration.astro`.
It executes the script located at `scripts/run_integration.py` during the build process.

### Customization

To modify the Python script, edit `scripts/run_integration.py`.
To modify the component logic, edit `src/components/PythonIntegration.astro`.

## Deployment

### Build Output

Static HTML files are generated in `dist/`:

```bash
npm run build
```

Deploy the `dist/` folder to:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront
- Any static host

### Environment Variables

Ensure `ASTRO_WP_API_URL` is set during build time. The API is only used at build time, not at runtime.

## Performance

- 100/100 Lighthouse score (with proper WordPress content)
- Zero JavaScript by default
- Static HTML with optimal caching headers
- Optimized for Core Web Vitals

## License

MIT

