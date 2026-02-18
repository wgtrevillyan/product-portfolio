/**
 * Generates sitemap.xml from static routes and JSON data (companies, products, patents).
 * Run as part of build so search engines can discover all public pages.
 *
 * Usage: node scripts/generate-sitemap.js
 * Optional: SITE_URL=https://example.com node scripts/generate-sitemap.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const SITE_URL = process.env.SITE_URL || 'https://www.trevillyan.dev';

const STATIC_PATHS = ['/', '/products', '/companies', '/patents', '/let-us-chat'];

function loadJSON(name) {
  const file = path.join(DATA_DIR, name);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function escapeXml(s) {
  if (s == null || s === '') return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlElement(loc, lastmod = null, changefreq = 'monthly', priority = null) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  const changefreqTag = changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : '';
  const priorityTag = priority != null ? `\n    <priority>${priority}</priority>` : '';
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}${changefreqTag}${priorityTag}
  </url>`;
}

function main() {
  const base = SITE_URL.replace(/\/$/, '');
  const urls = [];

  // Static pages
  for (const p of STATIC_PATHS) {
    urls.push(urlElement(base + p, null, 'monthly', p === '/' ? '1.0' : '0.9'));
  }

  // Company detail pages
  const companies = loadJSON('companies.json');
  for (const c of companies) {
    if (c.Slug) {
      urls.push(urlElement(`${base}/companies/${c.Slug}`, null, 'monthly', '0.8'));
    }
  }

  // Product detail pages
  const products = loadJSON('products.json');
  for (const p of products) {
    if (p.Slug) {
      urls.push(urlElement(`${base}/products/${p.Slug}`, null, 'monthly', '0.8'));
    }
  }

  // Patent detail pages
  const patents = loadJSON('patents.json');
  for (const p of patents) {
    if (p.Slug) {
      urls.push(urlElement(`${base}/patents/${p.Slug}`, null, 'monthly', '0.8'));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  const outPath = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  console.log(`Wrote ${urls.length} URLs to sitemap.xml (base: ${SITE_URL})`);
}

main();
