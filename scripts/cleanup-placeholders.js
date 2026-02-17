/**
 * Replaces full footer and header blocks with minimal placeholders.
 * Run this once to clean up HTML files. Then run `npm run build` to inject components.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FOOTER_REGEX = /<footer class="footer-component">[\s\S]*?<\/footer>/;
const FOOTER_PLACEHOLDER = '<footer class="footer-component"></footer>';

const HEADER_REGEX = /<div data-animation="default" class="navbar-2-component w-nav"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*(?=\s*<(?:div class="hero-section"|main class="main-wrapper"|section class="section-contact"))/;
const HEADER_PLACEHOLDER = `<div data-animation="default" class="navbar-2-component w-nav" data-easing2="ease" fs-scrolldisable-element="smart-nav" data-easing="ease" data-collapse="medium" data-w-id="5168f833-e3bd-529b-5f0f-d1346b2040f1" role="banner" data-duration="400">
  <div class="container-large">
    <div class="w-layout-hflex navbar-container constrained">
      <div class="navbar-container"></div>
    </div>
  </div>
</div>`;

function main() {
  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('404') && !f.startsWith('401'));

  for (const file of htmlFiles) {
    const filePath = path.join(ROOT, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (FOOTER_REGEX.test(content)) {
      content = content.replace(FOOTER_REGEX, FOOTER_PLACEHOLDER);
      changed = true;
    }

    // Skip detail_skills - it uses navbar-component, not navbar-2-component
    if (file !== 'detail_skills.html' && HEADER_REGEX.test(content)) {
      content = content.replace(HEADER_REGEX, HEADER_PLACEHOLDER);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Cleaned ${file}`);
    }
  }
}

main();
