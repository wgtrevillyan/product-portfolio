/**
 * Build-time header injector.
 * Replaces the navbar-2-component div block in each HTML file with components/header.html,
 * adding aria-current and w--current to the active nav link and logo (for home).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HEADER_PATH = path.join(ROOT, 'components', 'header.html');

// Match navbar-2-component block (not navbar-component used by detail_skills)
const HEADER_REGEX = /<div data-animation="default" class="navbar-2-component w-nav"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*(?=\s*<(?:div class="hero-section"|main class="main-wrapper"|section class="section-contact"))/;

/** Derive current page from filename for nav highlighting */
function getCurrentPage(filename) {
  if (filename === 'index.html') return 'home';
  if (filename === 'products.html') return 'products';
  if (filename === 'companies.html') return 'companies';
  if (filename === 'patents.html') return 'patents';
  if (filename === 'let-us-chat.html') return 'contact';
  // Detail pages: map to parent section for nav highlighting
  if (filename.startsWith('detail_products')) return 'products';
  if (filename.startsWith('detail_companies')) return 'companies';
  if (filename.startsWith('detail_patents')) return 'patents';
  return null;
}

/** Add aria-current and w--current to the correct navbar link and optionally logo */
function addCurrentPageMarker(header, currentPage) {
  if (!currentPage) return header;
  let out = header;
  // Remove any existing aria-current and w--current from all navbar links
  out = out.replace(/\s+aria-current="page"/g, '');
  out = out.replace(/\s+w--current/g, '');
  if (currentPage === 'home') {
    out = out.replace(
      /(<a [^>]*id="navbar-logo-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
    out = out.replace(
      /(<a [^>]*id="navbar-home-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  } else if (currentPage === 'products') {
    out = out.replace(
      /(<a [^>]*id="navbar-products-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  } else if (currentPage === 'companies') {
    // Companies page: navbar has no Companies link, so don't highlight any nav item
  } else if (currentPage === 'patents') {
    out = out.replace(
      /(<a [^>]*id="navbar-patents-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  } else if (currentPage === 'contact') {
    out = out.replace(
      /(<a [^>]*id="navbar-contact-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  }
  return out;
}

function main() {
  const header = fs.readFileSync(HEADER_PATH, 'utf8');
  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

  for (const file of htmlFiles) {
    const filePath = path.join(ROOT, file);
    let content = fs.readFileSync(filePath, 'utf8');
    // Skip detail_skills - it uses navbar-component, not navbar-2-component
    if (file === 'detail_skills.html') continue;
    if (!HEADER_REGEX.test(content)) continue;
    const currentPage = getCurrentPage(file);
    const headerWithCurrent = addCurrentPageMarker(header, currentPage);
    // Remove base indentation so replacement inherits parent indentation
    const headerTrimmed = headerWithCurrent.replace(/^ {4}/gm, '');
    content = content.replace(HEADER_REGEX, headerTrimmed);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Injected header into ${file} (current: ${currentPage || 'none'})`);
  }
}

main();
