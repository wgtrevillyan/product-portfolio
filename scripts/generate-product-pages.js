/**
 * Generates one static HTML file per product with correct Open Graph and
 * Twitter Card meta tags so LinkedIn and other crawlers get thumbnails.
 * Converts WebP thumbnails to PNG for og:image (LinkedIn supports only PNG/JPEG/GIF).
 * Also updates vercel.json so /products/:slug rewrites to the generated file.
 *
 * Run as part of: npm run build
 * Requires: data/products/products.json (from build:data), detail_products.html, sharp (devDependency)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_URL = 'https://www.trevillyan.dev';
const OG_IMAGE_DIR = path.join(ROOT, 'images', 'products', 'og');

let sharp;
try {
  sharp = require('sharp');
} catch (_) {
  sharp = null;
}

function escapeHtmlAttr(str) {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Ensure a LinkedIn-compatible image for og:image. LinkedIn accepts only PNG, JPEG, GIF (not WebP).
 * If the product thumb is WebP, convert it to PNG in images/products/og/<slug>-thumb.png.
 * Returns { url, width, height } (absolute URL and optional dimensions).
 */
async function getOgImage(product) {
  const slug = product.Slug;
  const imagePath = product['Thumbnai Image'] || '/images/products/products-header.webp';
  const ext = path.extname(imagePath).toLowerCase();
  const absoluteFallback = imagePath.startsWith('http') ? imagePath : BASE_URL + imagePath;

  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif') {
    return { url: absoluteFallback, width: null, height: null };
  }

  if (ext !== '.webp' || !sharp) {
    return { url: absoluteFallback, width: null, height: null };
  }

  const srcPath = path.join(ROOT, imagePath.replace(/^\//, ''));
  if (!fs.existsSync(srcPath)) {
    return { url: absoluteFallback, width: null, height: null };
  }

  if (!fs.existsSync(OG_IMAGE_DIR)) {
    fs.mkdirSync(OG_IMAGE_DIR, { recursive: true });
  }

  const pngName = `${slug}-thumb.png`;
  const destPath = path.join(OG_IMAGE_DIR, pngName);
  try {
    const meta = await sharp(srcPath)
      .png()
      .toFile(destPath);
    const pngUrl = `${BASE_URL}/images/products/og/${pngName}`;
    return { url: pngUrl, width: meta.width, height: meta.height };
  } catch (err) {
    console.warn(`generate-product-pages: could not convert ${imagePath} to PNG:`, err.message);
    return { url: absoluteFallback, width: null, height: null };
  }
}

function injectProductMeta(html, product, ogImage) {
  const slug = product.Slug;
  const name = product.Name || slug;
  const shortDesc =
    product['50 Character Description'] ||
    (product.Summary && String(product.Summary).replace(/<[^>]+>/g, '').trim()) ||
    '';
  const productUrl = `${BASE_URL}/products/${encodeURIComponent(slug)}`;
  const absoluteImage = ogImage.url;

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

  if (ogImage.width != null && ogImage.height != null) {
    out = out.replace(
      /(<meta content="[^"]*" property="og:image">)/,
      `$1\n  <meta content="${ogImage.width}" property="og:image:width">\n  <meta content="${ogImage.height}" property="og:image:height">`
    );
  }

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

async function main() {
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
    const ogImage = await getOgImage(product);
    const html = injectProductMeta(template, product, ogImage);
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

main().catch((err) => {
  console.error('generate-product-pages:', err);
  process.exit(1);
});
