# MasterDocsInnovexNow

RestroDocs documentation migrated from self-contained static HTML
pages to a React 19 and Vite 8 single-page application. The migration preserves
the original markup, styles, content, element IDs, and browser behavior.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm 10+

## Install and run

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run lint
npm test
npm run build
npm run preview
npm run security:audit
```

## Routes

- `/` — current homepage content from the original `index.html`
- `/system-hub` — content from the original `system-hub.html`
- `/index.html` — redirects to `/`
- `/system-hub.html` — redirects to `/system-hub`
- Unknown routes — React not-found page

URL hash fragments are retained by React Router and continue to work with
existing element IDs.

## Project structure

```text
legacy-original/   Original source-of-truth HTML snapshots
public/legacy/     Isolated compatibility scripts
scripts/           Reproducible static extraction utility
src/components/    Shared React rendering bridge
src/legacy/        Extracted page markup and page-specific CSS
src/pages/         Home, RestroDocs legacy view, and not-found pages
src/routes/        React Router configuration
tests/             Visible-behavior route and safety tests
```

The original pages have no local image, font, or icon assets and no external
stylesheets or script CDNs. Emoji icons and the original CSS remain unchanged.

## Migration notes

The static page bodies are parsed into React elements without
`dangerouslySetInnerHTML`. Existing inline actions are converted to safe React
event callbacks. The large existing browser script is temporarily isolated per
page under `public/legacy/` to preserve Supabase synchronization, local storage,
authentication, task-board, import/export, clipboard, admin, AWS, and roadmap
behavior without a risky functional rewrite.

Run `npm run migrate:legacy` only when deliberately regenerating the extracted
compatibility files from the original snapshots.

## Configuration and security

No `.env` file is required. Never place secrets in `VITE_*` variables because
Vite exposes those values to the browser bundle. The original pages contain a
Supabase anonymous client configuration; it remains available for behavioral
parity and should be protected by strict Supabase Row Level Security policies.

External links opened in new tabs receive `rel="noopener noreferrer"`. Vercel
adds MIME-sniffing, referrer, and restrictive browser-permission headers.
Deployment rewrites support SPA refreshes and both legacy HTML URLs.

The npm audit currently reports advisories in ESLint's development-only
transitive glob-matching dependencies and an RSC/server-action React Router
advisory. This application uses browser-only declarative routing and does not
enable RSC or server actions. Do not run `npm audit fix --force`; review the
toolchain again when compatible fixed releases are available.

## Deployment

Build with `npm run build` and deploy the generated `dist/` directory. The
included `vercel.json` preserves direct React-route refreshes and legacy URLs.
No deployment is performed by the migration scripts.

## Known limitations

- The compatibility browser modules still use direct DOM operations inherited
  from the original implementation. They are isolated and should be migrated
  incrementally to React state after parity is independently approved.
- Live Supabase actions require network access and valid database policies.
- The repository references `RND.md` and `RND.xlsx`, but those files were not
  present in the source repository during migration.
