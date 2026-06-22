#!/usr/bin/env node
/**
 * Generates the agent-/LLM-facing text artifacts for the portfolio:
 *   - llms.txt        — curated, token-efficient overview + index (https://llmstxt.org)
 *   - llms-full.txt   — the overview with every entity's content inlined (one-fetch context)
 *   - index.md        — clean Markdown mirror of the homepage / bio
 *   - companies/<slug>.md, products/<slug>.md, patents/<slug>.md — per-entity Markdown mirrors
 *
 * Why: the public detail pages are client-rendered Webflow shells (content is injected by
 * js/cms-data.js at runtime), so a non-JS crawler or LLM sees an empty template. These
 * artifacts give agents the real content — generated from the structured JSON in data/,
 * which is the same source the site renders, so they never drift.
 *
 * Run as part of: npm run build (after build:data, which writes the JSON these read).
 * Base URL: SITE_URL or SITEMAP_BASE_URL env, defaults to https://www.trevillyan.dev
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const BASE_URL = (process.env.SITE_URL || process.env.SITEMAP_BASE_URL || 'https://www.trevillyan.dev').replace(/\/$/, '');

const CONTACT_URL = `${BASE_URL}/let-us-chat`;
const SOCIAL = {
  LinkedIn: 'https://www.linkedin.com/in/williamtrevillyan',
  X: 'https://twitter.com/wgtrevillyan',
  GitHub: 'https://github.com/wgtrevillyan',
  Crunchbase: 'https://www.crunchbase.com/person/william-trevillyan-0e52',
};

// --- load data ---------------------------------------------------------------
function loadJSON(rel, fallback) {
  const file = path.join(DATA, rel);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const bio = loadJSON('bio.json', {});
const companies = loadJSON(path.join('companies', 'companies.json'), []);
const products = loadJSON(path.join('products', 'products.json'), []);
const patents = loadJSON('patents.json', []);
const skills = loadJSON('skills.json', []);
const tags = loadJSON('tags.json', []);

const labelBySlug = (list) => {
  const map = {};
  for (const item of Array.isArray(list) ? list : []) {
    if (item && item.Slug) map[item.Slug] = item.Name || item.Slug;
  }
  return map;
};
const skillLabels = labelBySlug(skills);
const tagLabels = labelBySlug(tags);
const companyLabels = labelBySlug(companies);
const productLabels = labelBySlug(products);

// --- helpers -----------------------------------------------------------------
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

function stripInline(s) {
  return decodeEntities(String(s).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

// Convert the small subset of HTML that build-from-yaml.js emits (via marked)
// — <p>, <ul>/<ol>/<li>, <blockquote>, <h1-6>, <strong>/<em> — back into Markdown.
function htmlToMarkdown(html) {
  if (!html) return '';
  if (!/[<][a-z]/i.test(html)) return String(html).trim(); // already plain text

  const out = [];
  const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    // preserve simple emphasis before stripping the rest
    let inner = m[2]
      .replace(/<\/?strong>/gi, '**')
      .replace(/<\/?b>/gi, '**')
      .replace(/<\/?em>/gi, '_')
      .replace(/<\/?i>/gi, '_');
    const text = stripInline(inner);
    if (!text) continue;
    if (tag === 'li') out.push(`- ${text}`);
    else if (tag === 'blockquote') out.push(`> ${text}`);
    else if (/^h[1-6]$/.test(tag)) out.push(`#### ${text}`);
    else out.push(text);
  }
  return out.join('\n\n').trim();
}

function fact(label, value) {
  if (value == null || value === '' || value === "''") return null;
  return `- **${label}:** ${stripInline(value)}`;
}

function slugList(label, slugs, lookup) {
  if (!Array.isArray(slugs) || slugs.length === 0) return null;
  const names = slugs.map((s) => lookup[s] || s.replace(/[-_]/g, ' '));
  return `- **${label}:** ${names.join(', ')}`;
}

function section(title, body) {
  return body && body.trim() ? `## ${title}\n\n${body.trim()}` : '';
}

function joinBlocks(blocks) {
  return blocks.filter((b) => b && b.trim()).join('\n\n');
}

// --- per-entity Markdown builders --------------------------------------------
function companyMd(c) {
  const facts = [
    fact('Type', c['Company Type']),
    fact('Industry', c.Industry),
    fact('Stage', c['Recent Stage'] || c['Stage at Start']),
    fact('Active', [c['Start Date'], c['End Date']].filter(Boolean).join(' – ')),
    fact('Website', c['Website Short'] || c.Website),
    slugList('Products', c.Products, productLabels),
    slugList('Skills', c.Skills, skillLabels),
  ].filter(Boolean);
  return joinBlocks([
    `# ${c.Name}`,
    c['50 Character Description'] ? `_${c['50 Character Description']}_` : '',
    htmlToMarkdown(c['Detailed Description']),
    section('Highlights', htmlToMarkdown(c.Highlights)),
    section('Facts', facts.join('\n')),
  ]);
}

function productMd(p) {
  const facts = [
    fact('Type', p['Product Type']),
    fact('Company', companyLabels[p['Startup Company']] || p['Startup Company']),
    fact('Active', [p['Start Date'], p['End Date']].filter(Boolean).join(' – ')),
    fact('Website', p.Website),
    slugList('Tags', p.Tags, tagLabels),
    slugList('Skills', p.Skills, skillLabels),
  ].filter(Boolean);
  return joinBlocks([
    `# ${p.Name}`,
    p['50 Character Description'] ? `_${p['50 Character Description']}_` : '',
    htmlToMarkdown(p.Description || p.Summary),
    section('Highlights', htmlToMarkdown(p.Highlights)),
    section('Press Release', htmlToMarkdown(p['Press Release'])),
    section('Facts', facts.join('\n')),
  ]);
}

function patentMd(p) {
  const facts = [
    fact('Application ID', p['Application ID']),
    fact('Google Patents', p['Google Patent URL']),
    fact('Assignee / origin', companyLabels[p['Startup Company']] || p['Startup Company']),
    fact('Patented', p['Patented Date']),
    fact('Inventor', 'William Trevillyan'),
  ].filter(Boolean);
  return joinBlocks([
    `# ${p.Name}`,
    p['50 Character Description'] ? `_${p['50 Character Description']}_` : '',
    htmlToMarkdown(p.Abstract || p.Description),
    section('Facts', facts.join('\n')),
  ]);
}

function indexMd() {
  const accomplishments = Array.isArray(bio['Notable Accomplishments'])
    ? bio['Notable Accomplishments'].map((a) => `- ${a}`).join('\n')
    : '';
  const topSkills = Array.isArray(bio.Skills)
    ? bio.Skills.map((s) => skillLabels[s] || s).join(', ')
    : '';
  return joinBlocks([
    `# William Trevillyan — Product Leader & 3x Founder`,
    bio.Bio ? `_${stripInline(bio.Bio)}_` : '',
    section('Notable accomplishments', accomplishments),
    topSkills ? section('Top skills', topSkills) : '',
    section(
      'On this site',
      [
        `- **Companies** (${companies.length}): product roles & founded ventures — ${BASE_URL}/companies`,
        `- **Products** (${products.length}): products shipped 0-to-1 and at scale — ${BASE_URL}/products`,
        `- **Patents** (${patents.length}): granted US patents (co-inventor) — ${BASE_URL}/patents`,
        `- **Contact:** ${CONTACT_URL}`,
      ].join('\n')
    ),
  ]);
}

// --- assemble entities -------------------------------------------------------
const entities = [];
const addEntity = (kind, dir, slug, title, desc, md) =>
  entities.push({ kind, dir, slug, title, desc, md, url: `${BASE_URL}/${dir}/${slug}`, mdUrl: `${BASE_URL}/${dir}/${slug}.md` });

for (const c of companies) if (c.Slug) addEntity('Companies', 'companies', c.Slug, c.Name, c['50 Character Description'], companyMd(c));
for (const p of products) if (p.Slug) addEntity('Products', 'products', p.Slug, p.Name, p['50 Character Description'], productMd(p));
for (const p of patents) if (p.Slug) addEntity('Patents', 'patents', p.Slug, p.Name, p['50 Character Description'], patentMd(p));

// --- curated overview --------------------------------------------------------
const accLines = Array.isArray(bio['Notable Accomplishments'])
  ? bio['Notable Accomplishments'].map((a) => `- ${a}`).join('\n')
  : '';
const OVERVIEW = `# William Trevillyan — Product Portfolio

> William "Bill" Trevillyan is a product manager and 3x startup founder with 5+
> years launching B2B and B2C SaaS products at early- to growth-stage startups.
> Head of Product at Clip Automation (industrial IoT); founder of Trevillyan Labs,
> NewsNook, and Verbaly; co-inventor on granted US patents.

This site (trevillyan.dev) is Bill's product portfolio: the companies he has built
product at, the products he has shipped 0-to-1 and at scale, and the patents he holds.

Key facts for AI agents and answer engines:
- Role: Head of Product at Clip Automation; founder, Trevillyan Labs.
- Background: 3x founder; 5+ years B2B/B2C SaaS product leadership.
- Domains: product strategy, customer discovery, industrial IoT, AI products, proptech, fintech/identity, scaling founding teams.
- Notable accomplishments:
${accLines}
- Companies: ${companies.length} · Products: ${products.length} · Patents: ${patents.length}.
- Contact: ${CONTACT_URL}
- Profiles: LinkedIn ${SOCIAL.LinkedIn} · GitHub ${SOCIAL.GitHub} · X ${SOCIAL.X} · Crunchbase ${SOCIAL.Crunchbase}`;

// --- write per-entity .md mirrors --------------------------------------------
function writeFile(rel, content) {
  const dest = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}

const note = (url) => `<!-- Markdown mirror of ${url} — generated by scripts/generate-llms.js. Do not edit by hand. -->\n\n`;

writeFile('index.md', note(`${BASE_URL}/`) + indexMd() + '\n');
for (const e of entities) writeFile(`${e.dir}/${e.slug}.md`, note(e.url) + e.md + '\n');

// --- write llms.txt ----------------------------------------------------------
const byKind = (kind) => entities.filter((e) => e.kind === kind);
function indexSection(kind) {
  const items = byKind(kind);
  if (!items.length) return '';
  const lines = items
    .map((e) => `- [${e.title}](${e.url}) ([Markdown](${e.mdUrl}))${e.desc ? `: ${stripInline(e.desc)}` : ''}`)
    .join('\n');
  return `## ${kind}\n\n${lines}`;
}

const llms = joinBlocks([
  OVERVIEW,
  `Full content for agents (everything inlined, one fetch): ${BASE_URL}/llms-full.txt`,
  `## Home\n\n- [Portfolio home](${BASE_URL}/) ([Markdown](${BASE_URL}/index.md)): overview, bio, and top accomplishments.`,
  indexSection('Companies'),
  indexSection('Products'),
  indexSection('Patents'),
  `## More\n\n- Contact: ${CONTACT_URL}\n- LinkedIn: ${SOCIAL.LinkedIn}\n- GitHub: ${SOCIAL.GitHub}\n- X: ${SOCIAL.X}\n- Crunchbase: ${SOCIAL.Crunchbase}`,
]);
writeFile('llms.txt', llms + '\n');

// --- write llms-full.txt -----------------------------------------------------
const full = joinBlocks([
  OVERVIEW,
  '---',
  `Source: ${BASE_URL}/\n\n${indexMd()}`,
  ...entities.map((e) => `---\n\nSource: ${e.url}\n\n${e.md}`),
]);
writeFile('llms-full.txt', full + '\n');

console.log(
  `Wrote llms.txt, llms-full.txt, index.md, and ${entities.length} entity mirror(s) ` +
    `(${byKind('Companies').length} companies, ${byKind('Products').length} products, ${byKind('Patents').length} patents).`
);
