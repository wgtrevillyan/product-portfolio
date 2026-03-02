/**
 * Generates one static HTML file per product with correct Open Graph and
 * Twitter Card meta tags so LinkedIn and other crawlers get thumbnails.
 * Also updates vercel.json so /products/:slug rewrites to the generated file.
 *
 * Run as part of: npm run build
 * Requires: data/products/products.json (from build:data), detail_products.html
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://www.trevillyan.dev';

function escapeHtmlAttr(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function injectProductMeta(html, product) {
  const slug = product.Slug;
  const name = product.Name || slug;
  const shortDesc =
    product['50 Character Description'] ||
    (product.Summary && String(product.Summary).replace(/<[^>]+>/g, '').trim()) ||
    '';
  const imagePath = product['Thumbnai Image'] || '/images/products/products-header.webp';
  const absoluteImage = imagePath.startsWith('http') ? imagePath : BASE_URL + imagePath;
  const productUrl = `${BASE_URL}/products/${encodeURIComponent(slug)}`;

  const title = `Product - ${name}`;
  let out = html
    .replace(/<title>Product -<\/title>/, `<title>${escapeHtmlAttr(title)}</title>`)
    .replace(
      /<meta content="" name="description">/,
      `<meta content="${escapeHtmlAttr(shortDesc)}" name="description">`
    )
    .replace(
      /<meta content="Product -" property="og:title">/,
      `<meta content="${escapeHtmlAttr(title)}" property="og:title">`
    )
    .replace(
      /<meta content="" property="og:description">/,
      `<meta content="${escapeHtmlAttr(shortDesc)}" property="og:description">`
    )
    .replace(
      /<meta content="" property="og:image">/,
      `<meta content="${escapeHtmlAttr(absoluteImage)}" property="og:image">`
    )
    .replace(
      /<meta content="Product -" property="twitter:title">/,
      `<meta content="${escapeHtmlAttr(title)}" property="twitter:title">`
    )
    .replace(
      /<meta content="" property="twitter:description">/,
      `<meta content="${escapeHtmlAttr(shortDesc)}" property="twitter:description">`
    )
    .replace(
      /<meta content="" property="twitter:image">/,
      `<meta content="${escapeHtmlAttr(absoluteImage)}" property="twitter:image">`
    )
    .replace(
      /<link href="https:\/\/www\.trevillyan\.dev\/detail_products" rel="canonical">/,
      `<link href="${escapeHtmlAttr(productUrl)}" rel="canonical">`
    );

  if (!out.includes('property="og:url"')) {
    out = out.replace(
      /<meta property="og:type" content="website">/,
      `<meta content="${escapeHtmlAttr(productUrl)}" property="og:url">\n  <meta property="og:type" content="website">`
    );
  } else {
    out = out.replace(
      /<meta content="[^"]*" property="og:url">/,
      `<meta content="${escapeHtmlAttr(productUrl)}" property="og:url">`
    );
  }
  return out;
}

function main() {
  const productsPath = path.join(ROOT, 'data', 'products', 'products.json');
  const templatePath = path.join(ROOT, 'detail_products.html');
  const outDir = path.join(ROOT, 'product_pages');
  const vercelPath = path.join(ROOT, 'vercel.json');

  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const template = fs.readFileSync(templatePath, 'utf8');

  if (!Array.isArray(products) || products.length === 0) {
    console.warn('generate-product-pages: no products in products.json');
    return;
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const productRewrites = [];
  for (const product of products) {
    const slug = product.Slug;
    if (!slug) continue;
    const html = injectProductMeta(template, product);
    fs.writeFileSync(path.join(outDir, `${slug}.html`), html, 'utf8');
    productRewrites.push({
      source: `/products/${slug}`,
      destination: `/product_pages/${slug}.html`,
    });
  }

  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  const isProductRewrite = (r) =>
    r.source === '/products/:slug' ||
    (r.source.startsWith('/products/') &&
      r.source !== '/products' &&
      r.destination &&
      r.destination.startsWith('/product_pages/'));
  const rewrites = vercel.rewrites.filter((r) => !isProductRewrite(r));
  const productsIndex = rewrites.findIndex((r) => r.source === '/products');
  const insertAt = productsIndex >= 0 ? productsIndex : rewrites.length;
  vercel.rewrites = [
    ...rewrites.slice(0, insertAt),
    ...productRewrites,
    ...rewrites.slice(insertAt),
  ];
  fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');

  console.log(`generate-product-pages: wrote ${productRewrites.length} product pages and updated vercel.json`);
}

main();
