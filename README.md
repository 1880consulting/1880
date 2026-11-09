# 1880

Source for **1880.io** (public website + the 1880 Studio CMS) and a private client portal for reports and proposals (subdomain to be decided; `clients.1880.io` for now).

> 🚧 Early build: the app is scaffolded with placeholder pages. Real pages come after the prototypes.
> - Plan: **[docs/PLAN.md](docs/PLAN.md)**
> - Prototype brief for Claude Design: **[docs/prototype-brief.md](docs/prototype-brief.md)**

## At a glance

- One Next.js 16 app:
  - `1880.io`: public site, CMS at `/admin`
  - `clients.1880.io/<client>`: gated client portal
- MySQL + Drizzle ORM
- Our own CMS (1880 Studio), built as a reusable engine
- Hosting (Hostinger, on the client's plan) is on hold. GitHub only for now

## Run it locally

Needs Node 22 (see `.nvmrc`) and Docker (for the local database).

```bash
npm install
```

```bash
npm run db:up
```

```bash
npm run db:migrate
```

```bash
npm run dev
```

`db:up` starts MySQL in Docker, `db:migrate` creates the tables. Copy `.env.example` to `.env.local` for optional settings such as `RESEND_API_KEY` (email alerts). `npm test` uses a separate `studio_test` database, so it never touches your local data.

Then open:

- http://localhost:3000: public site (`1880.io`)
- http://localhost:3000/admin: 1880 Studio (the CMS). It works only under `npm run dev` until staff sign-in is built.
- http://clients.localhost:3000/acme: client portal (works in Chrome and Edge with no setup)

## Checks

These also run on every pull request (GitHub Actions):

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

`npm run format` fixes formatting.

## Where things live

| Path | What |
|---|---|
| `src/proxy.ts` | Routes each request by hostname. Logic in `src/lib/routing.ts` (tested) |
| `src/app/(site)/` | Public pages, `1880.io`: home and Contact |
| `src/blocks/` | Page sections (component + zod schema each), e.g. hero, services |
| `src/site/` | Public-site chrome (nav, footer), shared UI, and `content.ts` (the site's words, until the CMS stores them) |
| `src/app/admin/` | 1880 Studio, `1880.io/admin` |
| `src/app/(portal)/portal/` | Client portal, served at `<PORTAL_SUBDOMAIN>.1880.io` |
| `src/app/api/health/` | Uptime check |
| `src/cms/` | The CMS engine: inquiries, settings, email, admin UI (`ui/`) |
| `src/lib/db/` | Database connection and tables (`schema.ts`). `npm run db:generate` turns a schema change into a numbered migration in `drizzle/` |
| `src/cms/ui/` | Admin building blocks in the 1880 OS look |
| `design-system/tokens.css` | Public-site tokens: the 1880 Design System v0.3, as on 1880consulting.com |
| `design-system/fonts/` | Libre Bodoni (OFL), self-hosted |
| `design-system/1880-os/` | 1880 OS tokens, font and logo for the admin (`npm run tokens:os` regenerates the CSS) |
