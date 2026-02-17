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

Image URLs in the JSON point to Webflow's CDN. To use local assets instead:

1. Download images to the `images/` folder structure
2. Update the JSON files to map CDN URLs to local paths (e.g. `images/products/xyz.webp`)
