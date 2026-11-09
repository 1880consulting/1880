# 1880: Website, CMS & Client Portal Plan

Status: **Draft v0.5** (planning only, no code yet)
Last updated: 2026-11-09

---

## 0. Decisions so far

| # | Decision | Date / who |
|---|---|---|
| D1 | Framework: **Next.js** (App Router, TypeScript) | Nov 9, Drew |
| D2 | Hosting: **Hostinger managed Node.js web apps**, on a plan **the client buys herself**. **On hold:** for now the work lives only in the GitHub repo, with no deployments | Nov 9, Drew (updated) |
| D3 | DNS stays at **GoDaddy**. Hostinger is **not** used for DNS | Nov 9, Drew |
| D4 | Portal content = **reports, proposals and similar documents** | Nov 9, Drew |
| D5 | **Only the 1880 team** creates and edits content. Clients view and download | Nov 9, Drew |
| D6 | Public site gets a **custom, modern CMS** (WordPress-easy, much better), building on what JMG did for Metro RES. "Best infrastructure for a modern CMS" is the goal (see §3) | Nov 9, Drew |
| D7 | **Nothing is live on `1880.io` today.** The business currently uses **`1880consulting.com`** | Nov 9, Drew |
| D8 | Client portal is **one app at one address**: **`clients.1880.io/<client-name>`**. No per-client subdomains | Nov 9, Drew |
| D9 | Drew builds **both prototypes (public site + client portal) in Claude Design first** and hands them off. The build follows the approved prototypes (see `docs/prototype-brief.md`) | Nov 9, Drew |
| D10 | Every client's area is **gated**: sign-in required, and each person sees only the clients they've been invited to | Nov 9, Drew |
| D11 | **`1880consulting.com` redirects to `1880.io`** at launch. **Email stays on `1880consulting.com`** and belongs to 1880's IT team: we never touch its mail records | Nov 9, Drew |
| D12 | **Proposals are view-only.** No e-sign or accept flow for now. **Don't overbuild v1** (see §5, v1 vs. later) | Nov 9, Drew |
| D13 | **Reports are mixed:** CMS-built documents, uploaded PDFs, **and custom interactive landing pages** like the ones JMG presents on `letswork.jmediagroup.net` (see §3.5) | Nov 9, Drew |
| D14 | Brand source: the **existing 1880 design system** JMG already built (web layer in `letswork-jmg/public/1880/assets/brand/1880.css`, tokens v2: monochrome, Bodoni, square corners, hairlines) | Nov 9, from letswork |
| D15 | Site emails (magic links, contact alerts, "new report" notices) **send from `1880consulting.com`** for now | Nov 9, Drew |
| D16 | **`1880consulting.com` DNS is at GoDaddy, and Drew makes the changes** (web records at launch, Resend sending records) | Nov 9, Drew |
| D17 | Font: ship the free **Libre Bodoni** only. **Later:** *LTC Bodoni 175 Pro*, the system's preferred face, once a web license is bought (the font stack already lists it first, so adding it is a drop-in) | Nov 9, Drew |

---

## 1. What we're building

| Surface | URL | Who uses it |
|---|---|---|
| **Public site** | `1880.io` (`www.1880.io` redirects here) | Everyone |
| **1880 Studio** (the CMS) | `1880.io/admin` | 1880 team only |
| **Client portal** | `clients.1880.io/<client>` (e.g. `clients.1880.io/acme`) | Each client's invited people |

One CMS runs everything. The 1880 team edits the public site **and** publishes each client's reports and proposals from the same `/admin`. Clients sign in at `clients.1880.io` and see only their own area.

**The golden rule:** someone signed in to `clients.1880.io/acme` can never see another client's data, whatever URL they type.

---

## 2. Architecture

### 2.1 One Next.js app, one repo

```
1880/                     ← Next.js app at the repo root (Hostinger needs this)
├── prototype/            ← approved Claude Design prototypes (the visual spec)
│   ├── public/
│   └── portal/
├── design-system/        ← 1880 tokens (CSS variables), logo, brand guide
├── src/
│   ├── app/
│   │   ├── (site)/       → public pages            1880.io
│   │   ├── admin/        → 1880 Studio CMS         1880.io/admin
│   │   ├── (portal)/     → client portal           clients.1880.io/[client]
│   │   └── api/          → health, forms
│   ├── cms/              → CMS core: content engine, editor, media, versions (reusable)
│   ├── blocks/           → 1880's page blocks (component + schema per block)
│   ├── lib/              → db, auth, portal, mail …
│   └── proxy.ts          → routes each request by hostname (see 2.2)
├── docs/
└── package.json
```

The public site, the CMS and the portal share one codebase, one design system and one database. That's what lets the team "manage it all under one app."

**How it gets hosted later (on hold, D2).** The same code can run two ways:
- **Two Hostinger sites** (recommended): one serves `1880.io`, the other `clients.1880.io`. A setting (`SITE_ROLE=public` / `portal`) tells each copy which part to serve. A problem on one can't take the other down, and the portal can run with fewer database permissions.
- **One Hostinger site** answering both addresses (`SITE_ROLE=all`), if the client's plan has only one Node.js slot.

Both deploy from `main`. No long-lived per-site branches: they drift apart and every fix has to be copied.

### 2.2 How a request is routed

`src/proxy.ts` checks the hostname (and the site role, once hosted):

| Request | Result |
|---|---|
| `1880.io/about` | Public page |
| `1880.io/admin/...` | CMS (staff sign-in required) |
| `www.1880.io/...` | 301 redirect to `1880.io/...` |
| `clients.1880.io/` | Sign-in page. After sign-in: straight to your client, or a picker if you belong to several |
| `clients.1880.io/acme/...` | Acme's area (client sign-in + Acme membership required) |
| `clients.1880.io/unknown` **or** a client you're not invited to | The same plain "Not found" page, so nobody can tell which clients exist |
| A portal URL on `1880.io`, or a public/admin URL on `clients.1880.io` | 404 |

**Reserved names** that can't be a client's URL name: `login`, `logout`, `auth`, `api`, `admin`, `account`, `settings`, `help`, `support`, `assets`, `static`, `images`, `files`, `health`, `robots.txt`, `sitemap.xml`, `favicon.ico`, anything starting with `_`.

### 2.3 Keeping clients' data separate

All clients share one address, so the protection is in the code and the database:

1. **The client comes from the URL** (`/acme`) and is checked on the server against the signed-in person's memberships. Unknown client and "not yours" look identical (both "Not found").
2. **A single portal data module** (`src/lib/portal/`) is the only code allowed to read client content. Every function needs the client and the signed-in person, checks membership, and every query includes `WHERE tenant_id = ?`. Portal pages never touch the database directly.
3. **Nothing about a client is shown before sign-in.** No logo or name on the login page, so client names stay private.
4. **Sessions:** host-only cookies. The client session lives on `clients.1880.io`, the staff session on `1880.io`. We **never** set a cookie for `.1880.io`.
5. **Random IDs** for documents and files, never 1, 2, 3…
6. **Files are streamed through the portal** after the same check, with `Cache-Control: private, no-store`, so no CDN ever caches them.
7. **Portal is always `noindex`** and blocked in `robots.txt`.
8. **Automated isolation tests** prove a person from client A gets "Not found" for every client B page, document and file. They run on every PR and must pass before any real client data goes in.
9. **Audit trail:** staff publishes, client sign-ins, views and downloads are all logged.

### 2.4 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16**, App Router, TypeScript (strict), `npm` | Same as Metro RES. Cache Components + `updateTag` give instant publishing |
| Database | **MySQL** (Hostinger's, at `127.0.0.1:3306` in production; Docker locally) | Included with Hostinger, proven on Metro RES |
| Data layer | **Drizzle ORM** + `drizzle-kit` migrations | Type-safe queries and generated, numbered migrations. An upgrade on Metro RES's hand-written SQL, same behavior |
| Validation | **zod** | One schema per block drives the editor form, validation and TypeScript types |
| Styling | Design tokens as CSS variables (`design-system/`) + CSS Modules | Same as Metro RES and SHK. Starts from the existing 1880 design system (D14), refined by the prototypes |
| Rich text | **Tiptap** (stores JSON, brand-safe marks only) | A real editor (headings, links, lists) that can't break the brand |
| Images | **sharp** → responsive WebP/AVIF variants, focal point, required alt text | Fast pages, good SEO |
| File storage | Behind a **storage adapter**: MySQL to start (Metro RES pattern), switchable to S3-compatible object storage (e.g. Cloudflare R2) by config | Hostinger wipes runtime files on deploy. Large PDFs may eventually outgrow the database |
| Staff sign-in | Email + password, owner/editor roles, rate limits, recovery mode | Ported from Metro RES |
| Client sign-in | **Magic link** (one-time emailed link) | Nothing for clients to remember |
| Email | **Resend** (contact alerts, magic links, "new report" notices), sending from **`1880consulting.com`** (D15), e.g. `notifications@1880consulting.com` | Same as Metro RES. Needs a few **added** Resend records on `1880consulting.com` (see §4.1); existing mail records stay exactly as they are |
| Forms | zod + honeypot + **Cloudflare Turnstile** | Same as Metro RES |
| Analytics | **Plausible** via a `track()` helper | Cookieless, works on any host |
| Tests | **Vitest** + **Playwright** | Same as Metro RES. Playwright covers editing, publishing and client isolation |
| CI | GitHub Actions: lint, typecheck, tests, build on every PR | Keeps `main` always deployable |

---

## 3. 1880 Studio: CMS architecture

**Goal:** WordPress-easy for the team, without WordPress's problems (plugin sprawl, security patches, broken layouts, slow pages). The design lives in code. Words, images and page structure live in the CMS.

### 3.1 Why custom (and what we compared)

| Option | Verdict |
|---|---|
| **Custom CMS inside the Next.js app** (chosen) | Fully tailored to 1880, runs on Hostinger with its MySQL, no extra services or fees. Reuses Metro RES's proven parts (sign-in, roles, audit, versions, media, inquiries, health). One app for site, CMS and portal |
| Payload CMS (open-source CMS inside Next.js) | The strongest off-the-shelf choice, but its database adapters are Postgres/MongoDB/SQLite, not MySQL. It would need an outside database and file storage, and it's generic rather than 1880-shaped |
| Sanity / Contentful (hosted) | Excellent editors, but a separate paid service holding the content, and the portal's private documents would live with a third party |
| WordPress (headless or classic) | The thing we're trying to beat: plugins, patching, slower, harder to keep on-brand |

**Built to be reused.** The CMS engine (`src/cms/`) is kept separate from 1880's blocks (`src/blocks/`), so it can later become a shared JMG package for SHK Phase 2 and other sites.

### 3.2 The content engine (how it works under the hood)

1. **Blocks defined in code.** Each block (hero, text, image + text, quote, logo wall, stats, case-study grid, team, FAQ, call to action…) is a folder with a React component and a zod schema. The schema generates the editor form, validates saves and gives TypeScript types. Add a block once and it's available everywhere.
2. **Content types.** Pages, plus collections like *Work / case studies*, *Insights / news*, *Team*, *Services*. Each has fields and a block area.
3. **Immutable versions.** Every save is a new version (a JSON document). An entry points to its current **draft** and its **published** version. Undo, roll back and "compare to published" all come for free. Stale-write protection stops two editors overwriting each other.
4. **Instant publishing at static speed.** Public pages are cached (`'use cache'` + a tag per entry). Publish calls `updateTag`, so the live page updates within a second and still loads like a static page.
5. **Live preview.** The editor shows the real page, rendered with the draft (Next.js draft mode), side by side as you type.
6. **Scheduled publishing.** Set a date and time; a small scheduler inside the app publishes it.
7. **Media pipeline.** Upload → automatic resizing to responsive WebP/AVIF → stored via the storage adapter. Alt text is required and the focal point is set by clicking, so crops never cut off faces.
8. **SEO built in.** Per-entry title, description and share image, with a Google/social preview. Auto-generated share images (`next/og`), `sitemap.xml`, JSON-LD per content type, `llms.txt`, canonical URLs, and **automatic redirects when a slug changes**.
9. **Headless-ready.** A read-only content API, so content could also feed an app or another site later.
10. **Safety.** Roles (owner/editor), activity log, rate-limited sign-in, strict security headers, health check, database backups.

### 3.3 What editors get (the WordPress-like experience)
- **Pages:** create, duplicate, delete. Add, reorder (drag), hide and remove blocks. Change URLs safely
- **Collections:** case studies, insights, team, services, with categories/tags and listing pages that update automatically
- **Draft → Preview → Publish → Schedule**, autosave, Undo, version history with Roll back
- **Media library:** search, reuse, replace an image everywhere at once
- **Menus, footer and site settings** (contact details, social links)
- **Redirects manager** and an **inquiries inbox** for the contact form (with Metro RES's "never lose a lead" email retry)
- **Apple-style admin**: sidebar on desktop, tab bar on phone, save bar, toasts (Metro RES `docs/admin-design.md`, re-tinted for 1880)

### 3.4 Portal management (same CMS)
- **Clients:** create (name, URL name, logo, accent color), archive
- **Client people:** invite by email, resend invite, remove access, see last sign-in. One person can belong to several clients
- **Documents per client:** reports, proposals and other types, in one of three formats (§3.5)
- **Publish to client**, optionally emailing "A new report is ready"
- **Receipts:** who opened what, and when
- **Preview as client** before publishing

### 3.5 The three document formats (D13)

Every document (report, proposal, other) has a type, a title and a status, plus one of these formats:

| Format | What it is | Who makes it | Best for |
|---|---|---|---|
| **1. Built in the CMS** | Assembled from portal blocks: rich text, stat tiles, image, video embed, file list, timeline/milestones | 1880 team, in `/admin`, no code | Routine reports and proposals |
| **2. Interactive page** | A custom, self-contained HTML landing page, like the hubs, dashboards, mood boards and proposals on `letswork.jmediagroup.net` | JMG, built with Claude (Claude Design / Claude Code), then uploaded in `/admin` | Showpiece reports, strategy decks, proposals that need to wow |
| **3. File** | An uploaded PDF (or deck, spreadsheet) shown with a viewer and a download button | 1880 team | Reports made elsewhere |

**How interactive pages work (format 2):**
- **Authoring** follows the letswork approach: one self-contained HTML file (CSS, JS and images embedded), responsive, respecting reduced motion, ideally using the 1880 design system. Data-driven pages (letswork's `PROJECT`-object dashboards) work as-is.
- **Uploading:** in the document editor, "Upload interactive page" stores the file through the storage adapter. Re-uploading creates a new version (undo and roll back work as for everything else).
- **Viewing:** the client opens `clients.1880.io/acme/d/<id>`. The portal checks membership, then shows the page full-screen inside a **sandboxed frame**, under a slim portal bar (back to documents, sign out).
- **Why sandboxed:** custom pages run their own JavaScript. The sandbox gives them no access to the portal's session, so even a buggy or copy-pasted script can't reach other documents or other clients. Because of the sandbox, pages must be **self-contained**: no loading images or scripts from the portal by relative paths. External fonts and libraries only from an allow-list (fonts, a charting CDN), set in the page's security policy.
- **Later (not v1):** multi-file bundles (`.zip` with an `assets/` folder) served with short-lived signed links, for pages too large to embed everything.

### 3.6 Data model (first pass)

```
-- staff & system
staff_users        id, email, name, password_hash, role(owner|editor), status, created_at
audit_log          id, actor_type(staff|client), actor_id, action, target, tenant_id NULL, created_at

-- public site content
entries            id, type(page|work|insight|team|service…), slug, status,
                   draft_version_id, published_version_id, scheduled_at, created_at, updated_at
entry_versions     id, entry_id, doc JSON (fields + blocks + SEO), author_id, created_at
media              id, storage_key, filename, mime, width, height, focal_x, focal_y, alt, bytes, created_at
media_blobs        media_id, variant, data LONGBLOB        -- only while storage = MySQL
redirects          id, from_path, to_path, code, created_at
settings           key, value JSON                       -- menus, footer, contact details
inquiries          (ported from Metro RES)

-- portal
tenants            id, slug, name, logo_media_id, accent_color, status, created_at
client_users       id, email, name, status, last_login_at
memberships        client_user_id, tenant_id, role(viewer)
login_tokens       id, client_user_id, token_hash, expires_at, used_at
documents          id(random), tenant_id, type(report|proposal|other), format(blocks|interactive|file),
                   title, status, draft_version_id, published_version_id, published_at
document_versions  id, document_id, doc JSON (blocks) | media_id (interactive HTML or file), author_id, created_at
document_files     id(random), document_id, tenant_id, media_id, label
document_events    id, document_id, tenant_id, client_user_id, kind(view|download), created_at
```

---

## 4. Domains & hosting (on hold)

### 4.1 Domains
- `1880.io`: new, nothing live (D7). Public site + CMS.
- `clients.1880.io`: client portal.
- `1880consulting.com`: today's domain. At launch its **website** records point at the public site, which 301-redirects every URL to the matching `1880.io` page (D11). Its **email** records (MX, SPF, DKIM, DMARC, autodiscover…) are 1880 IT's and are **never changed**. Before launch, list the current site's URLs and map each to its new page.

GoDaddy records needed at launch (once hosting exists). Drew makes all of them (D16):

| Domain | Change | Notes |
|---|---|---|
| `1880.io` | `A @`, `A www` (or `CNAME www → 1880.io`), `A clients` → the client's Hostinger IP | New domain, nothing to preserve |
| `1880consulting.com` | **Add** Resend's sending records (a DKIM `TXT` like `resend._domainkey`, plus `MX`/`TXT` on a `send.` subdomain for bounces) | Additive only. Before adding, export the zone and give 1880's IT a heads-up, since it's their mail domain. If they enforce a strict DMARC policy, check alignment with them |
| `1880consulting.com` | At launch: change only the `@` and `www` **web** records to Hostinger, for the redirect | MX, SPF, DKIM, DMARC, autodiscover and other mail records are never edited |

Path-based client URLs (D8) mean **no wildcard DNS or wildcard certificates**: one ordinary HTTPS certificate per hostname.

### 4.2 What the client's Hostinger plan needs (for when we resume)
- A plan that includes **Node.js web apps** (Business or Cloud; check the plan page lists Node.js) with room for **2 Node.js sites** (or 1, see §2.1) and **MySQL**
- Drew given access to manage it
- GitHub connected in hPanel, with access to `jmediagroup/1880` (or the repo transferred to the client's GitHub later)

Hostinger lessons carried from Metro RES (`metrores-web/docs/research/hostinger-deploy.md`): env vars are a full replace and can't be read back; `NEXT_PUBLIC_*` needs a rebuild; create the DB with our own password; builds are async (poll, never re-send); `output: "standalone"` is forced; `next.config` must export an object; add `sharp` to dependencies.

### 4.3 Environments (until hosting resumes)
| Env | Where |
|---|---|
| Local | `localhost:3000` (public + `/admin`) and `clients.localhost:3000` (portal), works in Chrome/Edge with no setup. MySQL in Docker (`docker compose up`) |
| CI | GitHub Actions with a throwaway MySQL service |
| Staging / production | Later, on the client's Hostinger plan |

---

## 5. Roadmap

### v1 vs. later (D12: don't overbuild)

| In v1 | Later, when there's a real need |
|---|---|
| Pages from blocks, collections (work, insights, team), drafts, live preview, publish, versions + undo | Scheduled publishing, side-by-side version compare |
| Media library with resizing + alt text, SEO panel, sitemap, redirects, menus/settings | Auto-generated share images, headless content API |
| Contact form → inquiries inbox | |
| Clients, people, invites, magic-link sign-in | Password or Google/Microsoft sign-in |
| Documents in all three formats, publish, optional "new report" email | Multi-file interactive bundles (`.zip`) |
| Basic portal blocks: text, stats, image, video, files, timeline | Chart blocks (interactive pages cover charts meanwhile) |
| "Last viewed" receipts | Detailed view/download analytics |
| Proposals view-only | Accept / approve, e-sign |

### Phase 0: Repo foundation (no design or hosting needed, can start now)
- [ ] Scaffold Next.js 16 at the repo root, TypeScript strict, ESLint, Prettier
- [ ] Docker MySQL for local dev, Drizzle schema + first migration
- [ ] `proxy.ts` hostname routing (`1880.io` / `clients.1880.io`), reserved names, `SITE_ROLE`
- [ ] Port Metro RES foundations: staff auth + roles, audit log, security headers, health check, mail
- [ ] GitHub Actions CI: lint, typecheck, unit tests, build
- [ ] Placeholder pages for all three surfaces

### Phase 1: Prototypes (Drew, in Claude Design)
- [ ] Public site prototype (`docs/prototype-brief.md` §A)
- [ ] Client portal prototype (`docs/prototype-brief.md` §B)
- [ ] Hand off into `prototype/` + brand tokens into `design-system/`

### Phase 2: CMS core + public site
- [ ] Content engine: blocks, entries, versions, drafts, live preview, publish, schedule
- [ ] Block library built from the public prototype
- [ ] Media library + pipeline, SEO panel, menus/settings, redirects
- [ ] Contact form → inquiries inbox + Resend
- [ ] SEO (metadata, JSON-LD, sitemap, OG images, `llms.txt`), Plausible, accessibility, Lighthouse ≥ 95

### Phase 3: Portal foundation
- [ ] Clients and client people in the CMS, invites
- [ ] Magic-link sign-in, client picker, sign-out, "Not found" handling
- [ ] Portal shell from the portal prototype, per-client logo/accent after sign-in
- [ ] Demo client with sample data
- [ ] **Isolation test suite passing** (gate for real data)

### Phase 4: Reports & proposals
- [ ] Document editor: format 1 (portal blocks), format 2 (interactive page upload), format 3 (file upload)
- [ ] Sandboxed full-screen viewer for interactive pages + its security policy. Test with a real letswork-style page
- [ ] Publish to client, optional "new report" email
- [ ] Portal home, document pages, downloads, print layout
- [ ] "Last viewed" receipts in the CMS, preview as client

### Phase 5: Hosting & launch (when the client's Hostinger plan exists)
- [ ] Create sites, MySQL, env vars, GitHub auto-deploy, staging review with `noindex`
- [ ] GoDaddy DNS for `1880.io` (Drew)
- [ ] Resend: verify `1880consulting.com` as the sending domain (Drew adds the records, IT informed)
- [ ] `1880consulting.com` → `1880.io` redirects: URL map from the current site, then Drew changes only the web records
- [ ] Security review, backups, uptime monitor on `/api/health`
- [ ] Launch, then onboard the first real client

---

## 6. Open questions

1. **Public site content:** pages, audience, main call to action. (The prototypes will answer most of this.)
2. **Sender details:** which address and name should site emails use (e.g. "1880 Consulting" `<notifications@1880consulting.com>`), and where should replies go?
3. **Client sign-in:** is a magic link fine for everyone at launch?
4. **Client URL names:** readable (`/acme`) is the default. Any clients whose name must stay discreet (e.g. a code name)?
5. **Who on the 1880 team needs CMS access**, and who is the owner?
6. **Repo ownership:** stays under `jmediagroup`, or transfers to the client at launch?

**Parked for later:** buying a web license for *LTC Bodoni 175 Pro* (D17).

---

## 7. Glossary

- **CMS:** the admin where the team edits content without touching code.
- **Block:** a pre-designed page section (hero, text, quote…) editors fill in. Layout and style stay locked to the brand.
- **Version:** a saved snapshot of a page or document. Lets you undo or roll back.
- **Tenant / client:** one client organization, with its own private area at `clients.1880.io/<name>`.
- **Magic link:** sign in by clicking a one-time link emailed to you.
- **Interactive page:** a custom, self-contained HTML landing page (like the letswork pages) uploaded as a portal document.
- **Sandboxed frame:** a locked-down window inside the portal page that runs an interactive page without giving it access to the portal.
- **Proxy (`proxy.ts`):** code that runs before every page, used to route by hostname and block wrong-site routes.
- **Migration:** a numbered, one-way database change applied automatically.
- **`noindex`:** tells Google not to list a page.
