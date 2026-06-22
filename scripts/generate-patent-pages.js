/**
 * Generates one static HTML file per patent from detail_patents.html, with correct
 * title/description/Open Graph/Twitter/canonical meta, CreativeWork (patent) JSON-LD,
 * and a crawler-visible <noscript> summary (the live page is otherwise client-rendered).
 * Rewires vercel.json so /patents/:slug serves the generated file instead of the
 * shared client-rendered template.
 *
 * Run as part of: npm run build
 * Requires: data/patents.json (from build:data), detail_patents.html
 */
const fs = require('fs');
const path = require('path');
const {
  BASE_URL,
  toText,
  ensureOgImage,
  injectDetailMeta,
  injectJsonLd,
  injectNoscript,
  patentLd,
} = require('./lib/seo');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  const patents = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'patents.json'), 'utf8'));
  const template = fs.readFileSync(path.join(ROOT, 'detail_patents.html'), 'utf8');
  const outDir = path.join(ROOT, 'patent_pages');
  const vercelPath = path.join(ROOT, 'vercel.json');

  if (!Array.isArray(patents) || patents.length === 0) {
    console.warn('generate-patent-pages: no patents in patents.json');
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });

  const rewrites = [];
  const redirects = [];
  for (const p of patents) {
    const slug = p.Slug;
    if (!slug) continue;
    const url = `${BASE_URL}/patents/${slug}`;
    const desc = toText(p['50 Character Description'] || p.Abstract);
    const og = await ensureOgImage(p['Thumbnai Image'], '/images/patents/patents-header.webp', 'patents', slug);

    const facts = [
      p['Application ID'] ? `Patent: ${p['Application ID']}` : '',
      p['Patented Date'] ? `Granted: ${p['Patented Date']}` : '',
      'Inventor: William Trevillyan',
    ].filter(Boolean);

    let html = injectDetailMeta(template, {
      prefix: 'Patent -',
      detailType: 'detail_patents',
      title: `Patent - ${p.Name}`,
      description: desc,
      image: og.url,
      url,
    });
    html = injectJsonLd(html, patentLd(p, url));
    html = injectNoscript(html, { title: p.Name, description: toText(p.Abstract || p.Description), facts });

    fs.writeFileSync(path.join(outDir, `${slug}.html`), html, 'utf8');
    rewrites.push({ source: `/patents/${slug}`, destination: `/patent_pages/${slug}.html` });
    redirects.push({ source: `/patents/${slug}/`, destination: `/patents/${slug}`, permanent: true });
  }

  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const isPatentRewrite = (r) =>
    r.source === '/patents/:slug' ||
    (r.source.startsWith('/patents/') &&
      r.source !== '/patents' &&
      r.destination &&
      (r.destination.startsWith('/patent_pages/') || r.destination === '/detail_patents.html'));
  const kept = vercel.rewrites.filter((r) => !isPatentRewrite(r));
  const idx = kept.findIndex((r) => r.source === '/patents');
  const insertAt = idx >= 0 ? idx : kept.length;
  vercel.rewrites = [...kept.slice(0, insertAt), ...rewrites, ...kept.slice(insertAt)];

  const isPatentRedirect = (r) =>
    r.source &&
    r.source.startsWith('/patents/') &&
    r.source.endsWith('/') &&
    r.destination &&
    r.destination.startsWith('/patents/') &&
    !r.destination.endsWith('/');
  const keptRedirects = (vercel.redirects || []).filter((r) => !isPatentRedirect(r));
  vercel.redirects = [...redirects, ...keptRedirects];

  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
  console.log(`generate-patent-pages: wrote ${rewrites.length} patent pages and updated vercel.json`);
}

main().catch((err) => {
  console.error('generate-patent-pages:', err);
  process.exit(1);
});
