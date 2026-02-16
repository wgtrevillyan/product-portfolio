# CMS Data

This folder contains the Webflow CMS content exported as CSV and converted to JSON.

## Structure

| File | Source | Description |
|------|--------|-------------|
| `*.csv` | Webflow CMS export | Raw CSV exports (source of truth) |
| `*.json` | Generated | Clean JSON consumed by the site |

## Workflow

1. **Export from Webflow**: In the Webflow dashboard, export each CMS collection as CSV and save to this folder.

2. **Convert to JSON**: Run `npm run build:data` to convert CSVs to JSON. This:
   - Filters out Draft and Archived items
   - Normalizes dates and multi-value fields
   - Outputs `products.json`, `companies.json`, `patents.json`, etc.

3. **Site usage**: The client-side script `js/cms-data.js` fetches these JSON files and populates the static HTML.

## Image URLs

Image URLs in the JSON point to Webflow's CDN. To use local assets instead:

1. Download images to the `images/` folder structure
2. Update the conversion script or run a find-replace to map CDN URLs to local paths (e.g. `images/products/xyz.webp`)
