/**
 * One-time migration: read companies.json and products.json, write one .yaml file per entity.
 * Uses js-yaml to serialize; long HTML is output as multiline strings.
 *
 * Run: node scripts/migrate-json-to-yaml.js
 * Requires: npm install js-yaml (devDependency)
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const COMPANIES_DIR = path.join(ROOT, 'data', 'companies');
const PRODUCTS_DIR = path.join(ROOT, 'data', 'products');

function main() {
  const companiesPath = path.join(COMPANIES_DIR, 'companies.json');
  const productsPath = path.join(PRODUCTS_DIR, 'products.json');

  if (!fs.existsSync(companiesPath)) {
    console.error('Missing:', companiesPath);
    process.exit(1);
  }
  if (!fs.existsSync(productsPath)) {
    console.error('Missing:', productsPath);
    process.exit(1);
  }

  const companies = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  const dumpOpts = { lineWidth: -1, noRefs: true };

  let written = 0;
  for (const c of companies) {
    const slug = c.Slug || String(c.Name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) {
      console.warn('Skipping company with no Slug:', c.Name);
      continue;
    }
    const outPath = path.join(COMPANIES_DIR, `${slug}.yaml`);
    fs.writeFileSync(outPath, yaml.dump(c, dumpOpts), 'utf8');
    written++;
    console.log('Wrote', outPath);
  }
  for (const p of products) {
    const slug = p.Slug || String(p.Name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) {
      console.warn('Skipping product with no Slug:', p.Name);
      continue;
    }
    const outPath = path.join(PRODUCTS_DIR, `${slug}.yaml`);
    fs.writeFileSync(outPath, yaml.dump(p, dumpOpts), 'utf8');
    written++;
    console.log('Wrote', outPath);
  }
  console.log(`\nDone. Wrote ${written} YAML files.`);
}

main();
