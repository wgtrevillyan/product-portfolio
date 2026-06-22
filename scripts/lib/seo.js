/**
 * Shared SEO/AEO helpers for the page generators:
 *   - JSON-LD builders (Person @graph, Organization, SoftwareApplication, CreativeWork/Patent)
 *   - injectors for <script type="application/ld+json"> and a crawler-visible <noscript> summary
 *
 * The detail pages are client-rendered Webflow shells, so non-JS crawlers and LLM fetchers see
 * an empty template. These helpers add (a) structured data they CAN parse from raw HTML and
 * (b) a minimal <noscript> summary — without disturbing the JS-rendered view in browsers.
 *
 * Used by scripts/generate-{product,company,patent}-pages.js and generate-home-jsonld.js.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.SITE_URL || process.env.SITEMAP_BASE_URL || 'https://www.trevillyan.dev').replace(/\/$/, '');
const PERSON_ID = `${BASE_URL}/#person`;
const ROOT = path.resolve(__dirname, '..', '..');

let sharp;
try {
  sharp = require('sharp');
} catch (_) {
  sharp = null;
}

const SAME_AS = [
  'https://www.linkedin.com/in/williamtrevillyan',
  'https://twitter.com/wgtrevillyan',
  'https://github.com/wgtrevillyan',
  'https://www.crunchbase.com/person/william-trevillyan-0e52',
  'https://patents.google.com/?inventor=William+Trevillyan',
];

// --- text helpers ------------------------------------------------------------
function escapeHtmlAttr(str) {
  if (str == null || str === '') return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function decodeEntities(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

// HTML (or plain text) → clean single-line plain text.
function toText(s) {
  if (s == null || s === '' || s === "''") return '';
  return decodeEntities(String(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Pull <li> texts out of a Highlights HTML blob.
function listItems(html) {
  if (!html) return [];
  const out = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = toText(m[1]);
    if (t) out.push(t);
  }
  return out;
}

function absUrl(p) {
  if (!p) return '';
  return /^https?:\/\//.test(p) ? p : `${BASE_URL}${p.startsWith('/') ? '' : '/'}${p}`;
}

// --- injectors ---------------------------------------------------------------
function injectJsonLd(html, obj) {
  const json = JSON.stringify(obj, null, 2);
  const block = `  <script type="application/ld+json" data-generated="portfolio">\n${json}\n  </script>\n`;
  // idempotent: drop any previously generated block first
  const cleaned = html.replace(/[ \t]*<script type="application\/ld\+json" data-generated="portfolio">[\s\S]*?<\/script>\n?/g, '');
  return cleaned.replace(/<\/head>/i, `${block}</head>`);
}

// Minimal crawler-visible summary. Lives in <noscript> so JS browsers ignore it
// (the Webflow JS renders the full interactive page) while non-JS agents get real content.
function injectNoscript(html, { title, description, highlights = [], facts = [] }) {
  const lis = highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('');
  const factLis = facts.filter(Boolean).map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  const summary =
    `<noscript data-generated="portfolio">\n` +
    `<article>\n<h1>${escapeHtml(title)}</h1>\n` +
    (description ? `<p>${escapeHtml(description)}</p>\n` : '') +
    (lis ? `<ul>${lis}</ul>\n` : '') +
    (factLis ? `<ul>${factLis}</ul>\n` : '') +
    `</article>\n</noscript>\n`;
  const cleaned = html.replace(/<noscript data-generated="portfolio">[\s\S]*?<\/noscript>\n?/g, '');
  return cleaned.replace(/(<body[^>]*>)/i, `$1\n${summary}`);
}

// --- og:image (LinkedIn accepts only PNG/JPEG/GIF; convert WebP → PNG) --------
async function ensureOgImage(imagePath, fallbackPath, ogSubdir, slug) {
  const src = imagePath || fallbackPath;
  const ext = path.extname(src || '').toLowerCase();
  const absoluteFallback = /^https?:\/\//.test(src) ? src : `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;

  if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) return { url: absoluteFallback };
  if (ext !== '.webp' || !sharp) return { url: absoluteFallback };

  const srcPath = path.join(ROOT, src.replace(/^\//, ''));
  if (!fs.existsSync(srcPath)) return { url: absoluteFallback };

  const ogDirAbs = path.join(ROOT, 'images', ogSubdir, 'og');
  fs.mkdirSync(ogDirAbs, { recursive: true });
  const pngName = `${slug}-og.png`;
  try {
    const meta = await sharp(srcPath).png().toFile(path.join(ogDirAbs, pngName));
    return { url: `${BASE_URL}/images/${ogSubdir}/og/${pngName}`, width: meta.width, height: meta.height };
  } catch (err) {
    console.warn(`ensureOgImage: could not convert ${src}:`, err.message);
    return { url: absoluteFallback };
  }
}

// --- per-detail-page meta injection ------------------------------------------
// Replaces the empty/placeholder meta in the Webflow detail templates. `prefix` is the
// template's placeholder title text (e.g. "Company:", "Patent -"); `detailType` is the
// canonical path stub it ships with (e.g. "detail_companies").
function injectDetailMeta(html, { prefix, detailType, title, description, image, url }) {
  const t = escapeHtmlAttr(title);
  const d = escapeHtmlAttr(description);
  const img = escapeHtmlAttr(image);
  let out = html
    .replace(`<title>${prefix}</title>`, `<title>${t}</title>`)
    .replace('<meta content="" name="description">', `<meta content="${d}" name="description">`)
    .replace(`<meta content="${prefix}" property="og:title">`, `<meta content="${t}" property="og:title">`)
    .replace('<meta content="" property="og:description">', `<meta content="${d}" property="og:description">`)
    .replace('<meta content="" property="og:image">', `<meta content="${img}" property="og:image">`)
    .replace(`<meta content="${prefix}" property="twitter:title">`, `<meta content="${t}" property="twitter:title">`)
    .replace('<meta content="" property="twitter:description">', `<meta content="${d}" property="twitter:description">`)
    .replace('<meta content="" property="twitter:image">', `<meta content="${img}" property="twitter:image">`)
    .replace(
      `<link href="${BASE_URL}/${detailType}" rel="canonical">`,
      `<link href="${escapeHtmlAttr(url)}" rel="canonical">`
    );
  if (!out.includes('property="og:url"')) {
    out = out.replace(
      '<meta property="og:type" content="website">',
      `<meta content="${escapeHtmlAttr(url)}" property="og:url">\n  <meta property="og:type" content="website">`
    );
  }
  return out;
}

// --- person reference (used as author/founder/etc. across entity pages) ------
const personRef = () => ({ '@type': 'Person', '@id': PERSON_ID, name: 'William Trevillyan', url: `${BASE_URL}/` });

// --- JSON-LD builders --------------------------------------------------------
function personGraph({ bio = {}, skillNames = [] } = {}) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: 'William Trevillyan',
        alternateName: 'Bill Trevillyan',
        jobTitle: 'Head of Product',
        description: toText(bio.Bio),
        url: `${BASE_URL}/`,
        image: `${BASE_URL}/images/headshot.webp`,
        worksFor: { '@type': 'Organization', name: 'Clip Automation', url: 'https://www.clipautomation.com/' },
        knowsAbout: skillNames,
        sameAs: SAME_AS,
      },
      {
        '@type': 'ProfilePage',
        '@id': `${BASE_URL}/#profilepage`,
        url: `${BASE_URL}/`,
        name: "William Trevillyan's Product Portfolio",
        about: { '@id': PERSON_ID },
        mainEntity: { '@id': PERSON_ID },
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: `${BASE_URL}/`,
        name: "William Trevillyan's Product Portfolio",
        publisher: { '@id': PERSON_ID },
      },
    ],
  };
}

function organizationLd(c, url) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}#organization`,
    name: c.Name,
    description: toText(c['50 Character Description'] || c['Detailed Description']),
    mainEntityOfPage: url,
  };
  const site = c['Website Short'] || c.Website;
  if (site) ld.url = String(site).split('?')[0];
  const logo = c['Logo (blue)'] || c['Logo (White)'];
  if (logo) ld.logo = absUrl(logo);
  if (c.Industry) ld.industry = toText(c.Industry);
  return ld;
}

function softwareAppLd(p, url, image) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${url}#product`,
    name: p.Name,
    description: toText(p['50 Character Description'] || p.Summary || p.Description),
    url,
    author: personRef(),
    mainEntityOfPage: url,
  };
  if (image) ld.image = image;
  return ld;
}

function patentLd(p, url) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${url}#patent`,
    name: p.Name,
    description: toText(p.Abstract || p.Description || p['50 Character Description']),
    url,
    author: personRef(),
    creator: personRef(),
    mainEntityOfPage: url,
  };
  if (p['Application ID']) ld.identifier = String(p['Application ID']).trim();
  if (p['Google Patent URL']) ld.sameAs = p['Google Patent URL'];
  return ld;
}

module.exports = {
  BASE_URL,
  PERSON_ID,
  SAME_AS,
  escapeHtmlAttr,
  escapeHtml,
  toText,
  listItems,
  absUrl,
  ensureOgImage,
  injectDetailMeta,
  injectJsonLd,
  injectNoscript,
  personGraph,
  organizationLd,
  softwareAppLd,
  patentLd,
};
