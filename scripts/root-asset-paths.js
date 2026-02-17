/**
 * Converts relative asset paths to root-relative paths in all HTML files.
 * Required for clean URLs (e.g. /products/clip360) where the browser
 * would otherwise resolve css/, js/, images/ relative to the current path.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const REPLACEMENTS = [
  [/href="css\//g, 'href="/css/'],
  [/href="images\//g, 'href="/images/'],
  [/src="images\//g, 'src="/images/'],
  [/src="js\//g, 'src="/js/'],
  // srcset: "images/... 500w, images/... 800w" -> "/images/... 500w, /images/... 800w"
  [/srcset="images\//g, 'srcset="/images/'],
  [/, images\//g, ', /images/'],
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  for (const [pattern, replacement] of REPLACEMENTS) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  if (modified) fs.writeFileSync(filePath, content, 'utf8');
  return modified;
}

// Root HTML files
const rootFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let changed = 0;
for (const file of rootFiles) {
  if (processFile(path.join(ROOT, file))) changed++;
}

// Components (footer, header) - may be embedded or used elsewhere
const componentsDir = path.join(ROOT, 'components');
if (fs.existsSync(componentsDir)) {
  const componentFiles = fs.readdirSync(componentsDir).filter((f) => f.endsWith('.html'));
  for (const file of componentFiles) {
    if (processFile(path.join(componentsDir, file))) changed++;
  }
}

console.log(`Updated root-relative asset paths in ${changed} HTML file(s)`);
