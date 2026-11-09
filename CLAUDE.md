# Notes for AI coding sessions

Read `docs/PLAN.md` first. It is the source of truth for architecture, decisions and roadmap. The visual spec is the approved prototypes in `prototype/` (see `docs/prototype-brief.md`).

## Ground rules
- **One Next.js 16 app at the repo root** serving three surfaces, routed by hostname in `src/proxy.ts`:
  - `1880.io`: public site; `1880.io/admin`: the CMS (1880 Studio).
  - `clients.1880.io/<client>`: client portal, one app for all clients (path-based, no per-client subdomains). The subdomain is **not decided**; `clients` is a working name read from `PORTAL_SUBDOMAIN`. Never hard-code it.
- **Current focus: `1880.io`** (public site + CMS). The portal comes after.
  - `SITE_ROLE` (`public` | `portal` | `all`) limits what a deployment serves. Wrong-role routes must 404, enforced in `proxy.ts` **and** in each route group's layout.
- **No deployments for now.** Hostinger is on hold until the client buys her own plan. Work happens in GitHub only. DNS will be at **GoDaddy**; never propose moving DNS to Hostinger.
- Database: **MySQL** (Hostinger's in production, Docker locally) via **Drizzle ORM**. Schema changes are generated, numbered migrations. Never edit a shipped one.
- Every Studio page section and server action that reads or changes data calls `requireStaff()` (`src/cms/auth.ts`) first, or `requireStaff({ owner: true })` for owner-only work. `proxy.ts` only does a quick cookie check; `requireStaff()` is the real one. Validate server-action arguments with zod: actions are public endpoints. Record sign-in and access changes with `audit()`.
- `npm test` uses the `studio_test` database (never the dev one). Database tests skip when MySQL isn't running.
- Security headers live in `src/lib/security-headers.ts`, applied by `proxy.ts`. The Content Security Policy allows only this site: adding an outside service (Plausible, Turnstile, a font or video host) means adding its origin there, in the same PR. Never use `dangerouslySetInnerHTML` with anything a visitor or editor typed.
- Never write files to disk at runtime (Hostinger wipes them on deploy). Use the storage adapter.
- Styling: design tokens as CSS variables in `design-system/` + CSS Modules. No Tailwind.
  - Public site: the 1880 Design System (Bodoni) in `design-system/tokens.css`.
  - CMS admin: **1880 OS** (Inter, charcoal sidebar, light + dark) in `design-system/1880-os/`, as `--os-*` variables scoped to `[data-os]`. Build admin UI from `src/cms/ui/` and follow the 1880 OS README (sentence case, one primary button per view, Tabler icons). Never edit `tokens.css` there by hand; run `npm run tokens:os`.
- CMS engine lives in `src/cms/` (reusable, no 1880 specifics). 1880's blocks live in `src/blocks/` (component + zod schema each).
  - A new block: a folder in `src/blocks/` with the component and a zod schema whose fields carry `.meta({ title, description })` labels, a `defineBlock(...)` with a label, description and defaults, then add it to `blockSchema`/`RenderBlocks` in `src/blocks/index.tsx` and to `pageType.blocks` in `src/site/cms.ts`. Studio's editor builds its form from the schema; no editor code needed.
  - Public pages read published content only through `src/site/pages.ts` (`"use cache"` + a tag per page). Anything that changes what's live calls `updateTag` for the affected pages in the same server action.
- **Client isolation:** the client comes from the URL and is checked against the signed-in person's memberships on the server. Portal pages read data only through `src/lib/portal/`, which filters every query by `tenant_id`. "Unknown client" and "not your client" return the same Not found page. Show no client names or logos before sign-in. Host-only cookies only (never `.1880.io`). Portal responses are `noindex` and `Cache-Control: private`.
- Only 1880 staff create content. Clients can view and download, never edit. Proposals are view-only (no e-sign). Build the v1 column in PLAN §5; don't overbuild.
- Portal documents come in three formats: CMS blocks, **interactive pages** (self-contained HTML, like letswork-jmg pages) and files. Interactive pages always render in a sandboxed iframe **without** `allow-same-origin`, behind the membership check.
- Email: site emails send from `1880consulting.com` via Resend. That domain's mailboxes belong to 1880's IT: only **add** Resend's records; never change its existing MX/SPF/DKIM/DMARC records. Drew makes all GoDaddy DNS changes.
- Brand: start from the existing 1880 design system (`letswork-jmg/public/1880/assets/brand/1880.css`): monochrome, Bodoni, square corners, hairlines. Ship **Libre Bodoni** only (self-hosted woff2). Keep *LTC Bodoni 175 Pro* first in the font stack for when a web license is bought.
- We build our own CMS. `jmediagroup/metrores-web` (Metro RES) was only a reference; port nothing from it. The agreed CMS spec is PLAN §3 and decisions D21–D30.
- Next.js 16 changed a lot. Read `node_modules/next/dist/docs/` before using an API you're unsure of.

## Working with Drew
- Drew is a fast-learning beginner who vibe-codes. Explain what you did in plain language, make the changes yourself, test them, report briefly.
- Ask before anything irreversible: DNS changes, creating or deleting hosting resources, sending real emails to clients.

## When the plan changes
Update `docs/PLAN.md` in the same PR: add to "Decisions so far" and remove answered items from "Open questions".
