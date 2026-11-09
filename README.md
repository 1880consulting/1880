# 1880

Source for **1880.io** (public website + the 1880 Studio CMS) and **clients.1880.io** (private client portal for reports and proposals).

> 🚧 Planning stage. No app code yet.
> - Plan: **[docs/PLAN.md](docs/PLAN.md)**
> - Prototype brief for Claude Design: **[docs/prototype-brief.md](docs/prototype-brief.md)**

## At a glance

- One Next.js 16 app:
  - `1880.io`: public site, CMS at `/admin`
  - `clients.1880.io/<client>`: gated client portal
- MySQL + Drizzle ORM
- Custom CMS building on the Metro RES admin (`jmediagroup/metrores-web`)
- Hosting (Hostinger, on the client's plan) is on hold. GitHub only for now
