/**
 * Generates one static HTML file per company from detail_companies.html, with correct
 * title/description/Open Graph/Twitter/canonical meta, Organization JSON-LD, and a
 * crawler-visible <noscript> summary (the live page is otherwise client-rendered).
 * Rewires vercel.json so /companies/:slug serves the generated file instead of the
 * shared client-rendered template.
 *
 * Run as part of: npm run build
 * Requires: data/companies/companies.json (from build:data), detail_companies.html
 */
const fs = require('fs');
const path = require('path');
const {
  BASE_URL,
  toText,
  listItems,
  ensureOgImage,
  injectDetailMeta,
  injectJsonLd,
  injectNoscript,
  organizationLd,
} = require('./lib/seo');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  const companies = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'companies', 'companies.json'), 'utf8'));
  const template = fs.readFileSync(path.join(ROOT, 'detail_companies.html'), 'utf8');
  const outDir = path.join(ROOT, 'company_pages');
  const vercelPath = path.join(ROOT, 'vercel.json');

  if (!Array.isArray(companies) || companies.length === 0) {
    console.warn('generate-company-pages: no companies in companies.json');
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });

  const rewrites = [];
  const redirects = [];
  for (const c of companies) {
    const slug = c.Slug;
    if (!slug) continue;
    const url = `${BASE_URL}/companies/${slug}`;
    const desc = toText(c['50 Character Description'] || c['Detailed Description']);
    const og = await ensureOgImage(c.Thumbnail || c['Hero Image'], '/images/companies/companies-header.webp', 'companies', slug);

    let html = injectDetailMeta(template, {
      prefix: 'Company:',
      detailType: 'detail_companies',
      title: `Company - ${c.Name}`,
      description: desc,
      image: og.url,
      url,
    });
    html = injectJsonLd(html, organizationLd(c, url));
    html = injectNoscript(html, { title: c.Name, description: desc, highlights: listItems(c.Highlights) });

    fs.writeFileSync(path.join(outDir, `${slug}.html`), html, 'utf8');
    rewrites.push({ source: `/companies/${slug}`, destination: `/company_pages/${slug}.html` });
    redirects.push({ source: `/companies/${slug}/`, destination: `/companies/${slug}`, permanent: true });
  }

  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const isCompanyRewrite = (r) =>
    r.source === '/companies/:slug' ||
    (r.source.startsWith('/companies/') &&
      r.source !== '/companies' &&
      r.destination &&
      (r.destination.startsWith('/company_pages/') || r.destination === '/detail_companies.html'));
  const kept = vercel.rewrites.filter((r) => !isCompanyRewrite(r));
  const idx = kept.findIndex((r) => r.source === '/companies');
  const insertAt = idx >= 0 ? idx : kept.length;
  vercel.rewrites = [...kept.slice(0, insertAt), ...rewrites, ...kept.slice(insertAt)];

  const isCompanyRedirect = (r) =>
    r.source &&
    r.source.startsWith('/companies/') &&
    r.source.endsWith('/') &&
    r.destination &&
    r.destination.startsWith('/companies/') &&
    !r.destination.endsWith('/');
  const keptRedirects = (vercel.redirects || []).filter((r) => !isCompanyRedirect(r));
  vercel.redirects = [...redirects, ...keptRedirects];

  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
  console.log(`generate-company-pages: wrote ${rewrites.length} company pages and updated vercel.json`);
}

main().catch((err) => {
  console.error('generate-company-pages:', err);
  process.exit(1);
});
