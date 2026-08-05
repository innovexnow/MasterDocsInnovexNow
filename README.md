# MasterDocsInnovexNow

Dynamic documentation CMS for RestroMind. The public documentation and admin
workspace are React views backed by Supabase/PostgreSQL; published navigation,
pages, sections, cards, tables, APIs, downloads, environments, and progress
records are loaded from the database rather than embedded in the frontend.

## Technology

- Node.js 20.19+ and npm
- React 19 + Vite 8
- Supabase authentication, PostgreSQL, and storage
- TailwindCSS build pipeline with a custom responsive dark SaaS interface
- Vitest and Testing Library

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Add the project URL and public anonymous key to `.env.local`. Apply
`database/schema.sql` in a new Supabase project's SQL editor, create an auth
user, then promote the first account with:

```sql
update public.users
set role = 'super_admin'
where email = 'your-email@example.com';
```

The public anonymous key is safe to use in the browser only with Row Level
Security enabled. Never place service-role keys or raw credentials in `VITE_*`
variables.

## Routes

- `/` — public documentation home
- `/docs/:slug` — database-rendered documentation page
- `/login` — Supabase email/password authentication
- `/admin` — authenticated CMS workspace

## Validation

```bash
npm run build
npm run lint
npm test
```

## Main structure

```text
database/schema.sql    normalized schema, triggers, seed settings, and RLS
src/lib/               Supabase client configuration
src/services/          database CRUD, search, and authentication services
src/App.jsx            public renderer, admin CMS, auth, and application shell
src/index.css          responsive visual system
tests/                 application behavior tests
```

The legacy HTML snapshots remain in the repository for reference, but they are
not used by the redesigned application.
