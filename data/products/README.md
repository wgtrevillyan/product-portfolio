# Products data (YAML source)

Each product has one `.yaml` file named by **Slug** (e.g. `owner-hub.yaml`). This folder is the human-editable source for the products list on the site.

## Workflow

1. **Edit** the `.yaml` files (add, remove, or change fields).
2. Run **`npm run build:data`** (or full **`npm run build`**) to regenerate `products.json` from all YAML files.
3. The site and other scripts load `products.json`; no need to edit JSON by hand.

## Schema (product YAML)

Use the same key names as in the generated JSON so the build output stays compatible.

| Key | Type | Notes |
|-----|------|--------|
| Name | string | Display name |
| Slug | string | URL slug, filename base (e.g. `owner-hub`) |
| 50 Character Description | string | Short tagline |
| Startup Company | string | Company slug (e.g. `property-meld`) |
| Featured | string | `"true"` or `"false"` |
| Sort Order | number | Order in lists (lower first) |
| Product Type | string | e.g. Product |
| Summary | string | Short summary |
| Description | string | Rich text (Markdown in YAML; converted to HTML during build) |
| Thumbnai Image | string | Path (note typo in key), e.g. `/images/products/{slug}-thumb.webp` |
| Project Image | string | Path, e.g. `/images/products/{slug}-project.webp` |
| Start Date / End Date | string | e.g. Jul 01, 2020 |
| Highlights | string | Rich text (Markdown in YAML; converted to HTML during build) |
| Press Release | string | Optional; rich text (Markdown in YAML; converted to HTML during build) |
| Services Text | string | Optional; rich text (Markdown in YAML; converted to HTML during build) |
| Website | string | Optional; URL or label |
| Live Link | string | Optional; URL |
| Demo Video | string | Optional; URL |
| Tags | array | List of tag slugs |
| Skills | array | List of skill slugs |

For keys that contain spaces or special characters, quote them in YAML (e.g. `"50 Character Description": "..."`). **Rich-text fields** (Highlights, Press Release, Summary, Description, Services Text) are written in **Markdown** using YAML literal block (`|`); the build script converts them to HTML when generating `products.json`, so the site still displays them correctly.

**Note:** `product-images.json` in this folder is a separate list (product gallery images) and is not built from YAML; edit it as JSON if needed.
