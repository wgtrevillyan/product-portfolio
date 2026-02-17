/**
 * Replaces .html links with clean URLs in all HTML files.
 * Run as part of build so links use /products instead of /products.html
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const REPLACEMENTS = [
  [/href="index\.html"/g, 'href="/"'],
  [/href="products\.html"/g, 'href="/products"'],
  [/href="patents\.html"/g, 'href="/patents"'],
  [/href="companies\.html"/g, 'href="/companies"'],
  [/href="let-us-chat\.html"/g, 'href="/let-us-chat"'],
  [/href="detail_products\.html/g, 'href="/detail_products'],
  [/href="detail_patents\.html/g, 'href="/detail_patents'],
  [/href="detail_companies\.html/g, 'href="/detail_companies'],
  [/href="detail_skills\.html/g, 'href="/detail_skills'],
  [/href="detail_tags\.html/g, 'href="/detail_tags'],
  [/href="detail_product-images\.html/g, 'href="/detail_product-images'],
  [/href="404\.html"/g, 'href="/404"'],
  [/href="401\.html"/g, 'href="/401"'],
];

const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let changed = 0;
for (const file of htmlFiles) {
  const filePath = path.join(ROOT, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  for (const [pattern, replacement] of REPLACEMENTS) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    changed++;
  }
}
console.log(`Updated clean URLs in ${changed} HTML file(s)`);
