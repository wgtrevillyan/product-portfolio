/**
 * Build-time footer injector.
 * Replaces the <footer class="footer-component">...</footer> block in each HTML file
 * with components/footer.html, adding aria-current and w--current to the active nav link.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FOOTER_PATH = path.join(ROOT, 'components', 'footer.html');
const FOOTER_REGEX = /<footer class="footer-component">[\s\S]*?<\/footer>/;

/** Derive current page from filename for nav highlighting */
function getCurrentPage(filename) {
  if (filename === 'index.html') return 'home';
  if (filename === 'products.html') return 'products';
  if (filename === 'companies.html') return 'companies';
  if (filename === 'patents.html') return 'patents';
  if (filename === 'let-us-chat.html') return 'contact';
  return null;
}

/** Add aria-current and w--current to the correct footer link */
function addCurrentPageMarker(footer, currentPage) {
  if (!currentPage) return footer;
  let out = footer;
  // Remove any existing aria-current and w--current from all footer links
  out = out.replace(/\s+aria-current="page"/g, '');
  out = out.replace(/\s+w--current/g, '');
  if (currentPage === 'home') {
    out = out.replace(
      /(<a id="footer-home-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
    out = out.replace(
      /(<a href="index\.html" id="footer-logo-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  } else if (currentPage === 'products') {
    out = out.replace(
      /(<a id="footer-products-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  } else if (currentPage === 'companies') {
    out = out.replace(
      /(<a id="footer-companies-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  } else if (currentPage === 'patents') {
    out = out.replace(
      /(<a id="footer-patents-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  } else if (currentPage === 'contact') {
    out = out.replace(
      /(<a id="footer-contact-button"[^>]*)(class=")([^"]*)(")/,
      '$1 aria-current="page" $2$3 w--current$4'
    );
  }
  return out;
}

function main() {
  const footer = fs.readFileSync(FOOTER_PATH, 'utf8');
  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

  for (const file of htmlFiles) {
    const filePath = path.join(ROOT, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (!FOOTER_REGEX.test(content)) continue;
    const currentPage = getCurrentPage(file);
    const footerWithCurrent = addCurrentPageMarker(footer, currentPage);
    content = content.replace(FOOTER_REGEX, footerWithCurrent);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Injected footer into ${file} (current: ${currentPage || 'none'})`);
  }
}

main();
