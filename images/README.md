# Image assets

Store site images in this folder using the following structure:

| Directory | Use for |
|-----------|---------|
| `./` | Shared assets (logo.svg, favicon.png, webclip.png, placeholder.svg, page-not-found.svg, checkbox-checkmark.svg) |
| `companies/` | Company logos, hero images, thumbnails (from data/companies.json or `npm run download-assets`) |
| `products/` | Product thumbnails and project images (from data/products.json or download-assets) |
| `patents/` | Patent thumbnails and project images (from data/patents.json or download-assets) |
| `product-images/` | Product gallery images (from data/product-images.json or download-assets) |

Reference in HTML/JSON with root-relative paths, e.g. `/images/logo.svg`, `/images/companies/companies-header.webp`.
