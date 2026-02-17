# William Trevillyan's Product Portfolio

A static portfolio site showcasing products, companies, patents, and skills. Built with Webflow-exported HTML/CSS and a client-side CMS that populates content from JSON files.

## Tech Stack

- **Frontend:** Static HTML, CSS (Webflow export), vanilla JavaScript
- **Content:** JSON files in `data/` fetched client-side via `js/cms-data.js`
- **Hosting:** Vercel (static + serverless API)
- **Contact Form:** Vercel serverless function using Nodemailer + Gmail SMTP

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

The build runs:

1. **Header injection** — Injects `components/header.html` into each page with correct nav highlighting
2. **Footer injection** — Injects `components/footer.html`
3. **Clean URLs** — Replaces `.html` links with path-based URLs
4. **Root asset paths** — Converts relative asset paths to root-relative (required for clean URLs like `/products/clip360`)

### Development

```bash
vercel dev
```

Uses Vercel's dev server with rewrites so routes like `/products` and `/products/clip360` work locally.

## Project Structure

```
├── api/                  # Vercel serverless functions
│   └── contact.js        # Contact form handler
├── components/           # Reusable HTML partials
│   ├── header.html
│   └── footer.html
├── css/                  # Stylesheets
├── data/                 # CMS content (JSON)
│   ├── products.json
│   ├── companies.json
│   ├── patents.json
│   ├── skills.json
│   ├── tags.json
│   └── product-images.json
├── images/               # Static assets
├── js/
│   ├── cms-data.js       # Fetches JSON and populates HTML
│   └── webflow.js        # Webflow interactions
├── scripts/              # Build scripts
│   ├── inject-header.js
│   ├── inject-footer.js
│   ├── clean-urls.js
│   └── root-asset-paths.js
├── vercel.json           # Rewrites and build config
└── *.html                # Page templates
```

## Deployment

Deploy to Vercel:

```bash
vercel
```

Or connect the repo to Vercel for automatic deploys on push.

### Environment Variables

For the contact form to work, set in Vercel:

| Variable | Description |
|----------|-------------|
| `SMTP_USER` | Gmail address (e.g. `no-reply@yourdomain.com`) |
| `SMTP_APP_PASSWORD` | Gmail App Password (not your regular password) |

## Clean URLs

The site uses path-based URLs instead of `.html`:

| URL | Serves |
|-----|--------|
| `/` | Home |
| `/products` | Products list |
| `/products/clip360` | Product detail (by slug) |
| `/companies` | Companies list |
| `/companies/property-meld` | Company detail |
| `/patents` | Patents list |
| `/patents/:slug` | Patent detail |
| `/let-us-chat` | Contact form |

## Content Management

Edit JSON files in `data/` to update products, companies, patents, and skills. See [data/README.md](data/README.md) for schema and structure.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Full build (header, footer, clean URLs, root paths) |
| `npm run build:header` | Inject header only |
| `npm run build:footer` | Inject footer only |
| `npm run cleanup` | Clean up placeholder content |
