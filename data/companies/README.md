# Companies data (YAML source)

Each company has one `.yaml` file named by **Slug** (e.g. `clip-automation.yaml`). This folder is the human-editable source for the companies list on the site.

## Workflow

1. **Edit** the `.yaml` files (add, remove, or change fields).
2. Run **`npm run build:data`** (or full **`npm run build`**) to regenerate `companies.json` from all YAML files.
3. The site and other scripts load `companies.json`; no need to edit JSON by hand.

## Schema (company YAML)

Use the same key names as in the generated JSON so the build output stays compatible.

| Key | Type | Notes |
|-----|------|--------|
| Name | string | Display name |
| Slug | string | URL slug, filename base (e.g. `clip-automation`) |
| Website | string | Primary URL |
| Website Short | string | Short display URL |
| Logo (White) | string | Path, e.g. `/images/companies/{slug}-logo-white.svg` |
| Logo (blue) | string | Path, e.g. `/images/companies/{slug}-logo-blue.svg` |
| Start Date | string | e.g. `Jan 08, 2025` |
| End Date | string | Optional |
| 50 Character Description | string | Short tagline |
| Detailed Description | string | Rich text (Markdown in YAML; converted to HTML during build) |
| Highlights | string | Rich text (Markdown in YAML; converted to HTML during build) |
| Company Type | string | e.g. Enterprise Saas, B2C IoT |
| Industry | string | e.g. Industrial IoT \| Electronics Manufacturing |
| Total Funding at Start / End | number | Optional |
| Stage at Start / End | string | e.g. Seed, Series A |
| Recent Stage / Recent Funding | string | Optional |
| Headcount at Start / End | number | Optional |
| Founding Year | string | Optional |
| Hero Image | string | Path, e.g. `/images/companies/{slug}-hero.webp` |
| Thumbnail | string | Path, e.g. `/images/companies/{slug}-thumbnail.webp` |
| Skills | array | List of skill slugs |
| Products | array | List of product slugs |
| Patents | array | Optional; list of patent slugs |

For keys that contain spaces or special characters, quote them in YAML (e.g. `"50 Character Description": "..."`). **Rich-text fields** (Detailed Description, Highlights) are written in **Markdown** using YAML literal block (`|`); the build script converts them to HTML when generating `companies.json`, so the site still displays them correctly.
