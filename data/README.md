# CMS Data

This folder contains JSON files that hold the site's content (products, companies, patents, skills, etc.).

## Structure

| File | Description |
|------|-------------|
| `products.json` | Product portfolio items |
| `companies.json` | Company/employer listings |
| `patents.json` | Patent listings |
| `skills.json` | Skill tags |
| `tags.json` | Tag metadata |
| `product-images.json` | Product image gallery entries |

## Usage

The client-side script `js/cms-data.js` fetches these JSON files and populates the static HTML.

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
