# CMS Data

This folder contains the site’s content datasets. Some are **human-edited YAML sources**, and some are **JSON**.

## Important

- **Do not edit generated JSON** for companies/products; it will be overwritten by the build.
- Edit the YAML sources instead, then run `npm run build:data` (or `npm run build`) to regenerate JSON.

## Structure

| File | Description |
|------|-------------|
| `companies/*.yaml` | Company source files (rich-text fields are **Markdown**) |
| `companies/companies.json` | **Generated** companies dataset used by the site |
| `products/*.yaml` | Product source files (rich-text fields are **Markdown**) |
| `products/products.json` | **Generated** products dataset used by the site |
| `products/product-images.json` | Product image gallery entries (still JSON) |
| `patents.json` | Patent listings (JSON) |
| `skills.json` | Skill tags (JSON) |
| `tags.json` | Tag metadata (JSON) |

## Usage

The client-side script `js/cms-data.js` fetches JSON files under `/data/` and populates the static HTML. Companies and products are fetched from:

- `/data/companies/companies.json`
- `/data/products/products.json`

## Image URLs

Image URLs in the JSON can point to Webflow's CDN or to local paths. To migrate from Webflow to local assets:

```bash
npm run download-assets
```

This script downloads all Webflow CDN assets (from `uploads-ssl.webflow.com` and `cdn.prod.website-files.com`) into `images/` and updates the JSON with root-relative paths (e.g. `/images/companies/clip-automation-logo-white.svg`). Directory structure:

- **companies:** `images/companies/{slug}-logo-white.{ext}`, `-logo-blue.{ext}`, `-hero.{ext}`, `-thumbnail.{ext}`
- **products:** `images/products/{slug}-thumb.{ext}`, `-project.{ext}`
- **patents:** `images/patents/{slug}-thumb.{ext}`, `-project.{ext}`
- **product-images:** `images/product-images/{slug}.{ext}`

Existing files are skipped (not re-downloaded). Requires Node 18+ and network access.
