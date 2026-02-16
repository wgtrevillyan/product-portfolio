#!/usr/bin/env node
/**
 * Converts Webflow CMS CSV exports to JSON files.
 * Filters out Draft and Archived items.
 * Run: node scripts/convert-csv-to-json.js
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_DIR = DATA_DIR;

// Fields to keep per collection (omit internal/metadata)
const PRODUCT_FIELDS = [
  'Name', 'Slug', '50 Character Description', 'Startup Company', 'Featured', 'Sort Order',
  'Product Type', 'Summary', 'Description', 'Thumbnai Image', 'Project Image',
  'Start Date', 'End Date', 'Highlights', 'Press Release', 'Services Text', 'Website',
  'Live Link', 'Tags', 'Demo Video', 'Services'
];
const COMPANY_FIELDS = [
  'Name', 'Slug', 'Website', 'Website Short', 'Logo (White)', 'Logo (blue)',
  'Start Date', 'End Date', '50 Character Description', 'Detailed Description',
  'Highlights', 'Company Type', 'Industry', 'Hero Image', 'Thumbnail',
  'Skills', 'Products', 'Patents', 'Products'
];
const PATENT_FIELDS = [
  'Name', 'Slug', '50 Character Description', 'Startup Company', 'Application ID',
  'Google Patent URL', 'Abstract', 'Featured', 'Sort Order', 'Summary', 'Description',
  'Thumbnai Image', 'Project Image', 'Start Date', 'End Date', 'Patented Date',
  'Highlights', 'Services'
];
const SKILL_FIELDS = ['Name', 'Slug', 'Description', 'Order'];
const TAG_FIELDS = ['Name', 'Slug'];
const PRODUCT_IMAGE_FIELDS = ['Name', 'Slug', 'Button ID (Image Order)', 'Product', 'Image', 'Image Description'];

function parseDate(str) {
  if (!str) return null;
  const m = str.match(/(\w{3})\s+(\d{1,2})\s+(\d{4})/);
  if (m) return `${m[1]} ${m[2]}, ${m[3]}`;
  return str;
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== '') out[k] = obj[k];
  }
  return out;
}

function convertProducts(rows) {
  return rows
    .filter(r => r.Draft !== 'true' && r.Archived !== 'true')
    .map(r => {
      const p = pick(r, PRODUCT_FIELDS);
      if (p['Start Date']) p['Start Date'] = parseDate(p['Start Date']);
      if (p['End Date']) p['End Date'] = parseDate(p['End Date']);
      if (p['Sort Order']) p['Sort Order'] = parseInt(p['Sort Order'], 10) || 0;
      if (p.Tags) p.Tags = p.Tags.split(';').map(s => s.trim()).filter(Boolean);
      if (p.Services) {
        p.Skills = p.Services.split(';').map(s => s.trim()).filter(Boolean);
        delete p.Services;
      }
      return p;
    })
    .sort((a, b) => (a['Sort Order'] || 999) - (b['Sort Order'] || 999));
}

function convertCompanies(rows) {
  return rows
    .filter(r => r.Draft !== 'true' && r.Archived !== 'true')
    .map(r => {
      const c = pick(r, COMPANY_FIELDS);
      if (c['Start Date']) c['Start Date'] = parseDate(c['Start Date']);
      if (c['End Date']) c['End Date'] = parseDate(c['End Date']);
      if (c.Skills) c.Skills = c.Skills.split(';').map(s => s.trim()).filter(Boolean);
      if (c.Products) c.Products = c.Products.split(';').map(s => s.trim()).filter(Boolean);
      if (c.Patents) c.Patents = c.Patents.split(';').map(s => s.trim()).filter(Boolean);
      return c;
    });
}

function convertPatents(rows) {
  return rows
    .filter(r => r.Draft !== 'true' && r.Archived !== 'true')
    .map(r => {
      const p = pick(r, PATENT_FIELDS);
      if (p['Start Date']) p['Start Date'] = parseDate(p['Start Date']);
      if (p['End Date']) p['End Date'] = parseDate(p['End Date']);
      if (p['Patented Date']) p['Patented Date'] = parseDate(p['Patented Date']);
      if (p['Sort Order']) p['Sort Order'] = parseInt(p['Sort Order'], 10) || 0;
      if (p.Services) p.Services = p.Services.split(';').map(s => s.trim()).filter(Boolean);
      return p;
    })
    .sort((a, b) => (a['Sort Order'] || 999) - (b['Sort Order'] || 999));
}

function convertSkills(rows) {
  return rows
    .filter(r => r.Draft !== 'true' && r.Archived !== 'true')
    .map(r => pick(r, SKILL_FIELDS))
    .sort((a, b) => (parseInt(a.Order, 10) || 999) - (parseInt(b.Order, 10) || 999));
}

function convertTags(rows) {
  return rows
    .filter(r => r.Draft !== 'true' && r.Archived !== 'true')
    .map(r => pick(r, TAG_FIELDS));
}

function convertProductImages(rows) {
  return rows
    .filter(r => r.Draft !== 'true' && r.Archived !== 'true')
    .map(r => pick(r, PRODUCT_IMAGE_FIELDS))
    .sort((a, b) => (a['Button ID (Image Order)'] || '').localeCompare(b['Button ID (Image Order)'] || ''));
}

function readCsv(filename) {
  const filepath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function writeJson(filename, data) {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Wrote ${filename}`);
}

function main() {
  console.log('Converting CSVs to JSON...\n');

  const products = convertProducts(readCsv('products.csv'));
  const companies = convertCompanies(readCsv('companies.csv'));
  const patents = convertPatents(readCsv('patents.csv'));
  const skills = convertSkills(readCsv('skills.csv'));
  const tags = convertTags(readCsv('tags.csv'));
  const productImages = convertProductImages(readCsv('product-images.csv'));

  writeJson('products.json', products);
  writeJson('companies.json', companies);
  writeJson('patents.json', patents);
  writeJson('skills.json', skills);
  writeJson('tags.json', tags);
  writeJson('product-images.json', productImages);

  console.log('\nDone.');
}

main();
