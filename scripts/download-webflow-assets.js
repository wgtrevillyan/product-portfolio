/**
 * Downloads Webflow CDN assets to local images/ directory and updates JSON to reference them.
 *
 * - companies.json: Logo (White), Logo (blue), Hero Image, Thumbnail → images/companies/{slug}-*
 * - products.json: Thumbnai Image, Project Image → images/products/{slug}-*
 * - patents.json: Thumbnai Image, Project Image → images/patents/{slug}-*
 * - product-images.json: Image → images/product-images/{slug}.{ext}
 *
 * Run: node scripts/download-webflow-assets.js
 * Requires Node 18+ (fetch). Uses network to download assets.
 */
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const IMAGES_DIR = path.join(ROOT, 'images');

const WEBFLOW_HOSTS = ['uploads-ssl.webflow.com', 'cdn.prod.website-files.com'];

function isWebflowUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return WEBFLOW_HOSTS.some((h) => u.hostname === h);
  } catch {
    return false;
  }
}

function getExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const decoded = decodeURIComponent(pathname);
    const match = decoded.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : 'webp';
  } catch {
    return 'webp';
  }
}

function safeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'asset';
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);
}

function loadJSON(name) {
  const file = path.join(DATA_DIR, name);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJSON(name, data) {
  const file = path.join(DATA_DIR, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Map: Webflow URL → root-relative path (e.g. /images/companies/foo.svg) for reuse
const urlToPath = new Map();
let downloaded = 0;
let skipped = 0;

async function ensureDownloaded(url, relativePath) {
  // relativePath is e.g. "companies/clip-automation-logo-white.svg"
  const rel = relativePath.replace(/\\/g, '/');
  const rootRel = '/' + path.join('images', rel).replace(/\\/g, '/');
  if (urlToPath.has(url)) return urlToPath.get(url);
  const fullPath = path.join(IMAGES_DIR, rel);
  if (fs.existsSync(fullPath)) {
    urlToPath.set(url, rootRel);
    skipped++;
    return rootRel;
  }
  await downloadToFile(url, fullPath);
  urlToPath.set(url, rootRel);
  downloaded++;
  return rootRel;
}

// --- Companies ---
async function processCompanies() {
  const data = loadJSON('companies.json');
  for (const c of data) {
    const slug = safeSlug(c.Slug);
    const fields = [
      ['Logo (White)', `companies/${slug}-logo-white`],
      ['Logo (blue)', `companies/${slug}-logo-blue`],
      ['Hero Image', `companies/${slug}-hero`],
      ['Thumbnail', `companies/${slug}-thumbnail`],
    ];
    for (const [key, baseName] of fields) {
      const url = c[key];
      if (!isWebflowUrl(url)) continue;
      const ext = getExtension(url);
      const rootRel = await ensureDownloaded(url, `${baseName}.${ext}`);
      c[key] = rootRel;
    }
  }
  saveJSON('companies.json', data);
}

// --- Products ---
async function processProducts() {
  const data = loadJSON('products.json');
  for (const p of data) {
    const slug = safeSlug(p.Slug);
    const fields = [
      ['Thumbnai Image', `products/${slug}-thumb`],
      ['Project Image', `products/${slug}-project`],
    ];
    for (const [key, baseName] of fields) {
      const url = p[key];
      if (!isWebflowUrl(url)) continue;
      const ext = getExtension(url);
      const rootRel = await ensureDownloaded(url, `${baseName}.${ext}`);
      p[key] = rootRel;
    }
  }
  saveJSON('products.json', data);
}

// --- Patents ---
async function processPatents() {
  const data = loadJSON('patents.json');
  for (const p of data) {
    const slug = safeSlug(p.Slug);
    const fields = [
      ['Thumbnai Image', `patents/${slug}-thumb`],
      ['Project Image', `patents/${slug}-project`],
    ];
    for (const [key, baseName] of fields) {
      const url = p[key];
      if (!isWebflowUrl(url)) continue;
      const ext = getExtension(url);
      const rootRel = await ensureDownloaded(url, `${baseName}.${ext}`);
      p[key] = rootRel;
    }
  }
  saveJSON('patents.json', data);
}

// --- Product images (gallery) ---
async function processProductImages() {
  const data = loadJSON('product-images.json');
  for (const item of data) {
    const url = item.Image;
    if (!isWebflowUrl(url)) continue;
    const slug = safeSlug(item.Slug);
    const ext = getExtension(url);
    const rootRel = await ensureDownloaded(url, path.join('product-images', `${slug}.${ext}`));
    item.Image = rootRel;
  }
  saveJSON('product-images.json', data);
}

async function main() {
  console.log('Downloading Webflow assets and updating JSON...\n');

  await processCompanies();
  await processProducts();
  await processPatents();
  await processProductImages();

  console.log(`Done. Downloaded ${downloaded} new file(s), skipped ${skipped} existing.`);
  console.log('JSON files updated with root-relative paths (e.g. /images/companies/...).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
