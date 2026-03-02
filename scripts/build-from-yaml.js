/**
 * Build script: read all data/companies/*.yaml and data/products/*.yaml,
 * output data/companies/companies.json and data/products/products.json.
 * Rich-text fields in YAML (Markdown) are converted to HTML for the site.
 *
 * Run: node scripts/build-from-yaml.js
 * Requires: js-yaml, marked (devDependencies)
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const COMPANIES_DIR = path.join(DATA_DIR, 'companies');
const PRODUCTS_DIR = path.join(DATA_DIR, 'products');
const BIO_PATH = path.join(DATA_DIR, 'bio.yaml');
const BIO_JSON_PATH = path.join(DATA_DIR, 'bio.json');

const COMPANY_RICH_TEXT_KEYS = new Set(['Highlights', 'Detailed Description']);
const PRODUCT_RICH_TEXT_KEYS = new Set([
  'Highlights',
  'Press Release',
  'Summary',
  'Description',
  'Services Text',
]);

function markdownToHtml(value) {
  if (value == null || typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  return marked.parse(trimmed);
}

function applyMarkdownToHtml(item, richTextKeys) {
  for (const key of richTextKeys) {
    if (item[key] != null && typeof item[key] === 'string') {
      item[key] = markdownToHtml(item[key]);
    }
  }
  return item;
}

function loadYamlFiles(dir, richTextKeys) {
  const items = [];
  if (!fs.existsSync(dir)) {
    return items;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'));
  for (const f of files) {
    const filePath = path.join(dir, f);
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      const data = yaml.load(content);
      if (data && typeof data === 'object') {
        applyMarkdownToHtml(data, richTextKeys);
        items.push(data);
      }
    } catch (err) {
      throw new Error(`${filePath}: ${err.message}`);
    }
  }
  return items;
}

function sortCompanies(a, b) {
  const slugA = (a.Slug || '').toLowerCase();
  const slugB = (b.Slug || '').toLowerCase();
  return slugA.localeCompare(slugB);
}

function sortProducts(a, b) {
  const orderA = a['Sort Order'] != null ? Number(a['Sort Order']) : 9999;
  const orderB = b['Sort Order'] != null ? Number(b['Sort Order']) : 9999;
  if (orderA !== orderB) return orderA - orderB;
  const slugA = (a.Slug || '').toLowerCase();
  const slugB = (b.Slug || '').toLowerCase();
  return slugA.localeCompare(slugB);
}

function main() {
  const companies = loadYamlFiles(COMPANIES_DIR, COMPANY_RICH_TEXT_KEYS);
  const products = loadYamlFiles(PRODUCTS_DIR, PRODUCT_RICH_TEXT_KEYS);

  companies.sort(sortCompanies);
  products.sort(sortProducts);

  const companiesOut = path.join(COMPANIES_DIR, 'companies.json');
  const productsOut = path.join(PRODUCTS_DIR, 'products.json');

  fs.writeFileSync(companiesOut, JSON.stringify(companies, null, 2), 'utf8');
  fs.writeFileSync(productsOut, JSON.stringify(products, null, 2), 'utf8');

  console.log(`Wrote ${companies.length} companies to ${path.relative(ROOT, companiesOut)}`);
  console.log(`Wrote ${products.length} products to ${path.relative(ROOT, productsOut)}`);

  if (fs.existsSync(BIO_PATH)) {
    const bioContent = fs.readFileSync(BIO_PATH, 'utf8');
    const bio = yaml.load(bioContent);
    if (bio && typeof bio === 'object') {
      const out = {
        Bio: bio.Bio != null ? String(bio.Bio).trim() : '',
        'Notable Accomplishments': Array.isArray(bio['Notable Accomplishments']) ? bio['Notable Accomplishments'] : [],
        Skills: Array.isArray(bio.Skills) ? bio.Skills : [],
      };
      fs.writeFileSync(BIO_JSON_PATH, JSON.stringify(out, null, 2), 'utf8');
      console.log(`Wrote bio to ${path.relative(ROOT, BIO_JSON_PATH)}`);
    }
  }
}

main();
