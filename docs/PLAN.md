# 1880: Website, CMS & Client Portal Plan

Status: **Draft v0.6** (app scaffolded; CMS spec agreed, see §3)
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
| D6 | Public site gets a **custom, modern CMS** (WordPress-easy, much better). "Best infrastructure for a modern CMS" is the goal (see §3) | Nov 9, Drew |
| D7 | **Nothing is live on `1880.io` today.** The business currently uses **`1880consulting.com`** | Nov 9, Drew |
| D8 | Client portal is **one app at one address**: **`<portal subdomain>.1880.io/<client-name>`**. No per-client subdomains. The subdomain is **`hub`**: `hub.1880.io` (D44) | Nov 9, Drew |
| D9 | Drew builds **both prototypes (public site + client portal) in Claude Design first** and hands them off. The build follows the approved prototypes (see `docs/prototype-brief.md`) | Nov 9, Drew |
| D10 | Every client's area is **gated**: sign-in required, and each person sees only the clients they've been invited to | Nov 9, Drew |
| D11 | **`1880consulting.com` redirects to `1880.io`** at launch. **Email stays on `1880consulting.com`** and belongs to 1880's IT team: we never touch its mail records | Nov 9, Drew |
| D12 | **Proposals are view-only.** No e-sign or accept flow for now. **Don't overbuild v1** (see §5, v1 vs. later) | Nov 9, Drew |
| D13 | **Reports are mixed:** CMS-built documents, uploaded PDFs, **and custom interactive landing pages** like the ones JMG presents on `letswork.jmediagroup.net` (see §3.5) | Nov 9, Drew |
| D14 | Brand source: the **existing 1880 design system** JMG already built (web layer in `letswork-jmg/public/1880/assets/brand/1880.css`, tokens v2: monochrome, Bodoni, square corners, hairlines) | Nov 9, from letswork |
| D15 | Site emails (magic links, contact alerts, "new report" notices) **send from `1880consulting.com`** for now | Nov 9, Drew |
| D16 | **`1880consulting.com` DNS is at GoDaddy, and Drew makes the changes** (web records at launch, Resend sending records) | Nov 9, Drew |
| D17 | Font: ship the free **Libre Bodoni** only. **Later:** *LTC Bodoni 175 Pro*, the system's preferred face, once a web license is bought (the font stack already lists it first, so adding it is a drop-in) | Nov 9, Drew |
| D18 | **Portal subdomain not decided.** `clients.1880.io` is a working name only. The app reads it from the `PORTAL_SUBDOMAIN` setting (default `clients`), so changing it later is a config change. **Focus now is `1880.io`** (public site + CMS); the portal follows. *Superseded by D44: the portal is `hub.1880.io`.* | Nov 9, Drew |
| D19 | **We build our own CMS.** Metro RES (`jmediagroup/metrores-web`) was only a reference; nothing is ported from it | Nov 9, Drew |
| D20 | **Repo:** `1880consulting/1880` on GitHub | Nov 9, Drew |
| D21 | CMS roles: **owner + editors.** Owners manage people and settings; editors write and publish | Nov 9, Drew |
| D22 | Editing: **block builder + live preview.** Editors stack pre-designed blocks and see the real page update beside the editor | Nov 9, Drew |
| D23 | v1 content types: **pages, case studies (work), services.** Insights and team are not CMS collections in v1 | Nov 9, Drew |
| D24 | Staff sign-in: **email + password, with a magic link as an option** at sign-in. No 2FA for now; sign-in is rate-limited and logged | Nov 9, Drew |
| D25 | Publishing: **drafts + version history** (undo, roll back). No scheduled publishing in v1 | Nov 9, Drew |
| D26 | Media: **shared media library**, images auto-resized, alt text required, focal point | Nov 9, Drew |
| D27 | Contact form: **saved to a CMS inbox + email alert.** Alert recipients are set by an owner in CMS settings | Nov 9, Drew |
| D28 | Editors manage **menus + footer** and **SEO per page** in the CMS. Redirects and contact details/social links stay in code for v1 | Nov 9, Drew |
| D29 | The CMS is a **reusable engine** (`src/cms/`), separate from 1880's blocks and styling (`src/blocks/`), so it can run other sites later | Nov 9, Drew |
| D30 | Admin look: **1880 OS**, the 1880 team's work-UI design system (Inter, charcoal sidebar, light + dark themes; [design system](https://claude.ai/artifact/3v3y6Zh7fSP6zQZXs744t7)). Tokens, font and logo live in `design-system/1880-os/`. The public site keeps the Bodoni 1880 Design System | Nov 9, Drew |
| D31 | **The public site starts as a rebuild of today's 1880consulting.com** (WordPress + Elementor Pro): the one-page home and the Contact page, same words, design and motion, in Next.js. Its sections become the first CMS blocks (`src/blocks/`). This replaces the Claude Design prototype of the public site for now | Nov 9, Drew |
| D32 | **Inquiries inbox:** every contact-form message is saved first, then the alert email goes out in the background (Resend, plain text, Reply-To = the sender). Failed alerts retry automatically up to 5 times, then wait for **Send alert again**. **Until staff sign-in exists, 1880 Studio runs only under `npm run dev`**: production answers 404 for `/admin` | Nov 9, Drew |
| D33 | **Staff sign-in is built:** email + password (scrypt) or an emailed one-time link, owner/editor roles, 14-day sessions in a host-only HttpOnly cookie, rate limits on every sign-in path, and an activity log. Emailed links open a confirm page first, because Microsoft 365's link scanner would otherwise use them up. Owners invite people from **People**; each invite also shows a copyable link, so invites work before email is set up. The first owner (and recovery if everyone is locked out) comes from `npm run studio:owner`. This replaces D32's "Studio only under `npm run dev`" | Nov 9, Drew |
| D34 | **Security headers and health check.** Every response gets a Content Security Policy that allows only this site (no outside scripts, fonts or frames), plus HSTS on HTTPS, nosniff, no framing, a strict referrer policy and a Permissions-Policy. Studio and portal pages are also `private, no-store` and `noindex`. Scripts allow `'unsafe-inline'` because pages are prerendered and Next.js starts each one with small inline scripts; a nonce-based policy was tried for Studio and broke its prerendered pages. Revisit if Studio ever renders fully on demand. `/api/health` checks the database and that every migration is applied: 200 or 503, with no error details | Nov 9, Drew |
| D35 | **CMS core is built.** Pages are made of blocks; every save is an immutable version; an entry points at its draft and its published version, with a guard against overwriting someone else's save. Studio's editor builds each block's form from the block's zod schema (labels via `.meta()`), so a new block needs no editor code. **Live preview** renders the draft with the real site blocks in a frame, updated as you type (only this site can frame it). **Publish** checks every visible section first and refreshes the page's cache tag, so the site updates at once while staying static. Moving a published page adds a 308 redirect from the old address. Unknown addresses answer a real 404 (`ensureStatic = "navigation"`). The home page was imported with `npm run cms:seed`; until a database has one, the built-in copy shows | Nov 9, Drew |
| D36 | **Media library is built.** Images upload once and are reused anywhere (the same file uploaded twice is stored once). Each upload is checked (JPEG, PNG, WebP, AVIF or GIF, up to 15 MB and 50 megapixels), turned upright, and made into AVIF and WebP at up to six widths; camera data such as GPS is removed from everything served, and originals are kept but never served. Files live in MySQL behind a storage adapter (`src/cms/media/storage.ts`), ready to switch to S3-compatible storage. Alt text is required before an image can go live; the focal point is set by clicking. Replacing a file updates every page that uses it; an image in use can't be deleted. Uploads go to `/admin/media/upload`, which skips the proxy (no body buffering) and checks the session and origin itself. First user: an **Image** section (framed or full width, with caption). SVG uploads aren't accepted (they can carry scripts) | Nov 9, Drew |
| D37 | **Menus and footer are editable** in Studio (Menus and footer): the top menu's links (up to 5), an optional menu button, the footer's links (up to 8, e.g. LinkedIn) and whether the footer shows the email address. Saving publishes at once (one cache tag on every page) and is logged. Links must be a page (`/…`), a section (`/#…`), a web address (`https://…`) or `mailto:`; `javascript:`, `data:` and `//other-site` are refused. Links to other sites open in a new tab. Until the first save the site shows the built-in menus. The email address itself stays in code (D28) | Nov 10, Drew |
| D38 | **Case studies and services are built** (D23). Case studies live at `/work/<address>` (client, summary, cover image, services, results), services at `/services/<address>` (summary, cover image, order); both can add sections. `/work` lists case studies newest first with service filters (in the browser, so the page stays static); `/services` lists services in their set order; each service page shows the case studies that use it. The engine now supports a content type's own fields (`ContentType.fields`, forms built from the schema like blocks), number fields and references to other entries (`.meta({ ref: "service" })`). Studio's Pages, Case studies and Services share one list, editor (with live preview) and history. Publishing a service refreshes the case studies that name it, and the other way round | Nov 10, Drew |
| D39 | **SEO is built.** Each page, case study and service has a search title and description (with length guidance), a share image (falls back to the cover) and "hide from search engines", with Google and share previews in the editor. Share images are 1200×630 JPEGs cropped at the focal point, made on first request and stored. Every page gets canonical, Open Graph and Twitter tags; the home page carries Organization structured data, case studies Article and services Service. `/sitemap.xml`, `/robots.txt` and `/llms.txt` list live, indexable pages and refresh on publish. Absolute URLs come from `SITE_URL` at build time. Icons are generated from the 1880 mark | Nov 10, Drew |
| D40 | **Analytics and the quality bar.** Plausible is wired in and switched on by `PLAUSIBLE_DOMAIN` (off until the account exists and open question 7 is settled); its origin joins the Content Security Policy only when it is on. Events: "Contact form sent", "Email copied". `npm run audit` checks every public page and Studio sign-in with axe (WCAG 2.2 AA, light and dark) and Lighthouse (mobile and desktop, every category ≥ 95). First run: all pages pass, scores 96–100. The statement block's scroll-lit words are faint below the reading line on purpose (screen readers get the full sentence), so the contrast check skips that copy. *Analytics superseded by D45: GA4.* | Nov 10, Drew |
| D41 | **Portal foundation is built.** Staff add clients in Studio (name, URL name, logo, accent color; archive and restore) and invite their people by email; any staff member can. Clients sign in with an emailed link only (15 minutes; invites last 7 days), confirmed with one click so email scanners can't use it up. `proxy.ts` checks the session and membership **before** a client page renders, so "unknown", "archived" and "not yours" all get the same real 404; every page checks again through `src/lib/portal/`. One client goes straight in; several get a picker. The portal session cookie is host-only on the portal host, separate from Studio's. The isolation suite (`src/lib/portal/isolation.test.ts`) runs in CI. `npm run portal:seed` adds a demo client. The portal look is built on the 1880 Design System and gets restyled when the portal prototype lands | Nov 10, Drew |
| D42 | **Reports and proposals are built.** Each client's page in Studio lists its documents and creates new ones in three formats. **Built in Studio:** the same block editor and live preview as pages, with portal sections (text, stats, image, video, files, timeline) and attachments. **Interactive page:** one uploaded `.html` file, shown full-screen in a frame sandboxed without `allow-same-origin`, under its own policy (inline code, Google Fonts and the jsDelivr, cdnjs and unpkg CDNs; no network requests). **File:** a PDF shows in a viewer; other files download. Every upload or edit is a version with restore. Publishing can email the client's people (one email each). Clients get a list with filters, search and "New" badges, print-friendly pages, and private downloads; Studio shows who opened what and when. Files are served only through the portal after the same checks, never cached. Images in documents come from the media library, whose addresses are public but unguessable, so confidential material goes in files | Nov 10, Drew |
| D43 | **Launch is prepared; the rest is Drew's.** `docs/LAUNCH.md` is the step-by-step runbook (Hostinger app and database, env vars, first owner, staging review, GoDaddy, Resend, launch, monitoring, first client). `npm start` runs the standalone server Hostinger needs. `SITE_INDEXING=off` keeps a staging copy out of search engines. The app redirects `1880consulting.com` itself once its web records point here: `/` and `/contact/` map to their new pages, WordPress leftovers to the home page | Nov 10, Drew |
| D44 | **Addresses decided.** The public site and 1880 Studio are at **`1880.io`**; the client portal is at **`hub.1880.io`**. `PORTAL_SUBDOMAIN` now defaults to `hub` and stays a setting | Nov 10, Drew |
| D45 | **Google tools and Resend.** Analytics is **Google Analytics 4** (`GA_MEASUREMENT_ID`, the same property as today's site, `G-FNXWW6CRNM`), on the public site only; Plausible is dropped. **Google Search Console** tracks the site (a Domain property for `1880.io`, and a change of address from `1880consulting.com`). Email goes through **Resend**, as planned | Nov 11, Drew |
| D46 | **Live on Hostinger as two apps.** `1880.io` went live on Nov 11 as a Node.js app (`SITE_ROLE=public`: the public site and Studio). The client portal is a second Node.js app from the same repo and database at `hub.1880.io` (`SITE_ROLE=portal`, `SKIP_MIGRATIONS=1`, so only the first app updates the database). `npm run build` applies migrations first, because Hostinger runs plain `npm run build` | Nov 11, Drew |
| D47 | **First owner from the browser.** `/admin/setup` creates the first Studio owner with a code from `STUDIO_SETUP_TOKEN`, and loads today's home page into Studio. It exists only while Studio has no owner and the code is set (the proxy answers a real 404 otherwise), refuses wrong codes with a rate limit, and logs every try. `npm run studio:owner` stays for recovery | Nov 11, Drew |
| D48 | **Two typefaces.** Headings (and display lines) stay **Bodoni**; body copy, navigation, buttons and forms are **Neue Haas Grotesk** (Text), on the public site and the portal. It's a paid face, so it comes from an **Adobe Fonts kit** (`ADOBE_FONTS_KIT`); until the kit is set, Helvetica Neue (its descendant, on every Apple device) then Arial stand in. Studio keeps Inter (1880 OS) | Nov 11, Drew |
| D49 | **Performance pass on the live sites.** The Adobe Fonts kit loads in the background (it blocked drawing for ~1.8 s on phones), with Arial resized to Neue Haas Grotesk's measured proportions as the stand-in, so nothing moves when it swaps in (layout shift 0). GA4's script loads once the page is idle. The menu no longer ships the form-validation library. Public pages tell caches (Hostinger's CDN) to keep a copy for 60 s, so a publish shows everywhere within about a minute. The hub serves the site icons. Lab scores: desktop 100 everywhere; mobile 93–96 (`/contact` 91–92), largest content in 0.9 s; GA4 is most of what's left. The mobile target with GA4 on is ≥ 90 (D40's 95 was set before analytics) | Nov 11, Drew |
| D50 | **Studio workflow upgrades.** **Overview** shows recent content changes, what's waiting to be published (pages and client documents), new inquiries, and the week's numbers. **Activity** (owners) lists everything from the activity log as plain sentences, filtered by person, dates and words. **Autosave**: the editor saves 3 s after the last change; a run of autosaves by one person keeps one version per 10 minutes, and manual saves and live versions are always kept. **Share preview**: 7-day links to a draft at `1880.io/preview/<token>` (hash stored, turn off any time, private, noindex, no analytics, a real 404 once dead). **Inquiries**: a reply that quotes the message, a Spam view kept out of the inbox and counts, and a spreadsheet export with formulas defused | Nov 12, Drew |

---

## 1. What we're building

| Surface | URL | Who uses it |
|---|---|---|
| **Public site** | `1880.io` (`www.1880.io` redirects here) | Everyone |
| **1880 Studio** (the CMS) | `1880.io/admin` | 1880 team only |
| **Client portal** | `hub.1880.io/<client>` (e.g. `hub.1880.io/acme`) (D44) | Each client's invited people |

One CMS runs everything. The 1880 team edits the public site **and** publishes each client's reports and proposals from the same `/admin`. Clients sign in at `hub.1880.io` and see only their own area.


**The golden rule:** someone signed in to `hub.1880.io/acme` can never see another client's data, whatever URL they type.

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
│   │   ├── (portal)/     → client portal           hub.1880.io/[client]
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
- **Two Hostinger sites** (recommended): one serves `1880.io`, the other `hub.1880.io`. A setting (`SITE_ROLE=public` / `portal`) tells each copy which part to serve. A problem on one can't take the other down, and the portal can run with fewer database permissions.
- **One Hostinger site** answering both addresses (`SITE_ROLE=all`), if the client's plan has only one Node.js slot.

Both deploy from `main`. No long-lived per-site branches: they drift apart and every fix has to be copied.

### 2.2 How a request is routed

`src/proxy.ts` checks the hostname (and the site role, once hosted):

| Request | Result |
|---|---|
| `1880.io/about` | Public page |
| `1880.io/admin/...` | CMS (staff sign-in required) |
| `www.1880.io/...` | 301 redirect to `1880.io/...` |
| `hub.1880.io/` | Sign-in page. After sign-in: straight to your client, or a picker if you belong to several |
| `hub.1880.io/acme/...` | Acme's area (client sign-in + Acme membership required) |
| `hub.1880.io/unknown` **or** a client you're not invited to | The same plain "Not found" page, so nobody can tell which clients exist |
| A portal URL on `1880.io`, or a public/admin URL on `hub.1880.io` | 404 |

**Reserved names** that can't be a client's URL name: `login`, `logout`, `auth`, `api`, `admin`, `account`, `settings`, `help`, `support`, `assets`, `static`, `images`, `files`, `health`, `robots.txt`, `sitemap.xml`, `favicon.ico`, `portal`, anything starting with `_`.

**How it's built:** portal pages live under an internal `/portal` folder in `src/app/(portal)/`. `proxy.ts` rewrites `hub.1880.io/acme` to `/portal/acme`, and 404s `/portal` on `1880.io` (which is why `portal` is reserved). Checks that decide between a page and "Not found" (reserved names now, client membership in Phase 3) must finish **before** the page starts streaming, because a streamed page has already sent a `200` status. The proxy is the safest place for them.

### 2.3 Keeping clients' data separate

All clients share one address, so the protection is in the code and the database:

1. **The client comes from the URL** (`/acme`) and is checked on the server against the signed-in person's memberships. Unknown client and "not yours" look identical (both "Not found").
2. **A single portal data module** (`src/lib/portal/`) is the only code allowed to read client content. Every function needs the client and the signed-in person, checks membership, and every query includes `WHERE tenant_id = ?`. Portal pages never touch the database directly.
3. **Nothing about a client is shown before sign-in.** No logo or name on the login page, so client names stay private.
4. **Sessions:** host-only cookies. The client session lives on `hub.1880.io`, the staff session on `1880.io`. We **never** set a cookie for `.1880.io`.
5. **Random IDs** for documents and files, never 1, 2, 3…
6. **Files are streamed through the portal** after the same check, with `Cache-Control: private, no-store`, so no CDN ever caches them.
7. **Portal is always `noindex`** and blocked in `robots.txt`.
8. **Automated isolation tests** prove a person from client A gets "Not found" for every client B page, document and file. They run on every PR and must pass before any real client data goes in.
9. **Audit trail:** staff publishes, client sign-ins, views and downloads are all logged.

### 2.4 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16**, App Router, TypeScript (strict), `npm` | Cache Components + `updateTag` give instant publishing |
| Database | **MySQL** (Hostinger's, at `127.0.0.1:3306` in production; Docker locally) | Included with Hostinger |
| Data layer | **Drizzle ORM** + `drizzle-kit` migrations | Type-safe queries and generated, numbered migrations |
| Validation | **zod** | One schema per block drives the editor form, validation and TypeScript types |
| Styling | Design tokens as CSS variables (`design-system/`) + CSS Modules | Starts from the existing 1880 design system (D14), refined by the prototypes |
| Rich text | **Tiptap** (stores JSON, brand-safe marks only) | A real editor (headings, links, lists) that can't break the brand |
| Images | **sharp** → responsive WebP/AVIF variants, focal point, required alt text | Fast pages, good SEO |
| File storage | Behind a **storage adapter**: MySQL to start, switchable to S3-compatible object storage (e.g. Cloudflare R2) by config | Hostinger wipes runtime files on deploy. Large PDFs may eventually outgrow the database |
| Staff sign-in | Email + password, or a magic link if preferred (D24). Owner/editor roles, rate limits, activity log | Built in-house |
| Client sign-in | **Magic link** (one-time emailed link) | Nothing for clients to remember |
| Email | **Resend** (contact alerts, magic links, "new report" notices), sending from **`1880consulting.com`** (D15), e.g. `notifications@1880consulting.com` | Needs a few **added** Resend records on `1880consulting.com` (see §4.1); existing mail records stay exactly as they are |
| Forms | zod + honeypot + **Cloudflare Turnstile** | Stops spam without annoying people |
| Analytics | **Google Analytics 4** via a `track()` helper (D45) | The same property as today's site, so history carries over |
| Tests | **Vitest** + **Playwright** | Playwright covers editing, publishing and client isolation |
| CI | GitHub Actions: lint, typecheck, tests, build on every PR | Keeps `main` always deployable |

---

## 3. 1880 Studio: CMS architecture

**Goal:** WordPress-easy for the team, without WordPress's problems (plugin sprawl, security patches, broken layouts, slow pages). The design lives in code. Words, images and page structure live in the CMS.

### 3.1 Why custom (and what we compared)

| Option | Verdict |
|---|---|
| **Custom CMS inside the Next.js app** (chosen) | Fully tailored to 1880, runs on Hostinger with its MySQL, no extra services or fees. One app for site, CMS and portal |
| Payload CMS (open-source CMS inside Next.js) | The strongest off-the-shelf choice, but its database adapters are Postgres/MongoDB/SQLite, not MySQL. It would need an outside database and file storage, and it's generic rather than 1880-shaped |
| Sanity / Contentful (hosted) | Excellent editors, but a separate paid service holding the content, and the portal's private documents would live with a third party |
| WordPress (headless or classic) | The thing we're trying to beat: plugins, patching, slower, harder to keep on-brand |

**Built to be reused (D29).** The CMS engine (`src/cms/`) knows nothing about 1880: content types, blocks, styling and site settings are passed in by the site. 1880's blocks live in `src/blocks/` and its theme in `design-system/`. The same engine could later run another site (for example a client's) with its own blocks and theme.

### 3.2 The content engine (how it works under the hood)

1. **Blocks defined in code.** Each block (hero, text, image + text, quote, logo wall, stats, case-study grid, services list, FAQ, call to action…) is a folder with a React component and a zod schema. The schema generates the editor form, validates saves and gives TypeScript types. Add a block once and it's available everywhere.
2. **Content types (D23).** Pages, plus two collections: *Case studies (work)* and *Services*. Each has its own fields and a block area. More types (insights, team) can be added later as configuration.
3. **Immutable versions.** Every save is a new version (a JSON document). An entry points to its current **draft** and its **published** version. Undo, roll back and "compare to published" all come for free. Stale-write protection stops two editors overwriting each other.
4. **Instant publishing at static speed.** Public pages are cached (`'use cache'` + a tag per entry). Publish calls `updateTag`, so the live page updates within a second and still loads like a static page.
5. **Live preview.** The editor shows the real page, rendered with the draft (Next.js draft mode), side by side as you type.
6. **Scheduled publishing (later, D25).** Not in v1. The data model keeps room for it.
7. **Media pipeline.** Upload → automatic resizing to responsive WebP/AVIF → stored via the storage adapter. Alt text is required and the focal point is set by clicking, so crops never cut off faces.
8. **SEO built in.** Per-entry title, description and share image, with a Google/social preview. Auto-generated share images (`next/og`), `sitemap.xml`, JSON-LD per content type, `llms.txt`, canonical URLs, and **automatic redirects when a slug changes**.
9. **Headless-ready.** A read-only content API, so content could also feed an app or another site later.
10. **Safety.** Roles (owner/editor), activity log, rate-limited sign-in (password or magic link, D24), strict security headers, health check, database backups.

### 3.3 What editors get (the WordPress-like experience)
- **Pages (D22):** create, duplicate, delete. Add, reorder (drag), hide and remove blocks in a side panel while the real page updates beside it (live preview). Change URLs safely
- **Collections (D23):** case studies and services, with categories/tags and listing pages that update automatically
- **Draft → Preview → Publish (D25):** autosave, Undo, version history with Roll back
- **Media library (D26):** upload once and reuse anywhere, search, replace an image everywhere at once. Alt text required, focal point by clicking
- **Menus + footer, SEO per page (D28):** search title, description and share image, with a Google preview
- **Inquiries inbox (D27):** every contact-form message is saved first, then emailed to the recipients an owner picks in Settings. If the email fails, it retries, and the message is still in the inbox
- **People (D21):** owners invite editors, change roles and remove access. Sign in with a password or an emailed magic link (D24)
- **Admin look (D30):** 1880 OS. Charcoal sidebar with the 1880 mark, sticky header, white cards on a gray canvas, light and dark themes, save bar, toasts

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
- **Viewing:** the client opens `hub.1880.io/acme/d/<id>`. The portal checks membership, then shows the page full-screen inside a **sandboxed frame**, under a slim portal bar (back to documents, sign out).
- **Why sandboxed:** custom pages run their own JavaScript. The sandbox gives them no access to the portal's session, so even a buggy or copy-pasted script can't reach other documents or other clients. Because of the sandbox, pages must be **self-contained**: no loading images or scripts from the portal by relative paths. External fonts and libraries only from an allow-list (fonts, a charting CDN), set in the page's security policy.
- **Later (not v1):** multi-file bundles (`.zip` with an `assets/` folder) served with short-lived signed links, for pages too large to embed everything.

### 3.6 Data model (first pass)

```
-- staff & system
staff_users        id, email(unique), name, password_hash, role(owner|editor), status(invited|active|disabled),
                   created_at, last_login_at
staff_sessions     token_hash, user_id, created_at, expires_at          -- cookie holds the token, DB only its hash
staff_tokens       token_hash, user_id, purpose(login|invite|reset), expires_at, used_at
rate_limits        id, key, created_at
audit_log          id, actor_type(staff|client|system), actor_id, action, target, detail JSON, created_at
                   + tenant_id for portal events

-- public site content
entries            id, type(page|work|service), slug, status,
                   draft_version_id, published_version_id, created_at, updated_at
entry_versions     id, entry_id, doc JSON (fields + blocks + SEO), author_id, created_at
media              id, storage_key, filename, mime, width, height, focal_x, focal_y, alt, bytes, created_at
media_blobs        media_id, variant, data LONGBLOB        -- only while storage = MySQL
redirects          id, from_path, to_path, code, created_at   -- automatic on slug change
settings           key, value JSON                       -- menus, footer, inquiry alert recipients
inquiries          id(random), name, email, message, status(new|read|archived),
                   alert_status(pending|sent|failed|skipped), alert_attempts, alert_error,
                   alert_claimed_at, alerted_at, created_at, read_at

-- portal
tenants            id, slug, name, logo_media_id, accent_color, status(active|archived), created_at
client_users       id, email(unique), name, status(active|disabled), created_at, last_login_at
memberships        client_user_id, tenant_id, invited_by, created_at        -- everyone is a viewer in v1
client_sessions    token_hash, user_id, created_at, expires_at          -- portal cookie, hash only
client_tokens      token_hash, user_id, purpose(login|invite), expires_at, used_at
documents          id(random), tenant_id, kind(report|proposal|other), format(blocks|interactive|file),
                   status(draft|published), draft_version_id, published_version_id, published_at
document_versions  id, document_id, tenant_id, doc JSON (title, summary, blocks, file id), author_id, note, created_at
document_files     id(random), tenant_id, document_id, purpose(interactive|file|attachment), filename, mime,
                   bytes, sha256                                         -- bytes in storage, key portal/<tenant>/<id>
document_events    id, document_id, tenant_id, client_user_id, kind(view|download), file_id, created_at
```

---

## 4. Domains & hosting (on hold)

### 4.1 Domains
- `1880.io`: new, nothing live (D7). Public site + CMS.
- `hub.1880.io`: client portal.
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
- GitHub connected in hPanel, with access to `1880consulting/1880`

Known Hostinger quirks: env vars are a full replace and can't be read back; `NEXT_PUBLIC_*` needs a rebuild; create the DB with our own password; builds are async (poll, never re-send); `output: "standalone"` is forced; `next.config` must export an object; add `sharp` to dependencies.

### 4.3 Environments (until hosting resumes)
| Env | Where |
|---|---|
| Local | `localhost:3000` (public + `/admin`) and `hub.localhost:3000` (portal), works in Chrome/Edge with no setup. MySQL in Docker (`docker compose up`) |
| CI | GitHub Actions with a throwaway MySQL service |
| Staging / production | Later, on the client's Hostinger plan |

---

## 5. Roadmap

### v1 vs. later (D12: don't overbuild)

| In v1 | Later, when there's a real need |
|---|---|
| Pages from blocks, collections (case studies, services), drafts, live preview, publish, versions + undo | Scheduled publishing, side-by-side version compare, insights and team collections |
| Media library with resizing + alt text, SEO panel, sitemap, automatic slug redirects, menus + footer | Redirects manager, editable contact details/social links, auto-generated share images, headless content API |
| Contact form → inquiries inbox + email alert | |
| Staff sign-in: password or magic link | Two-factor sign-in, Microsoft 365 sign-in |
| Clients, people, invites, magic-link sign-in | Password or Google/Microsoft sign-in for clients |
| Documents in all three formats, publish, optional "new report" email | Multi-file interactive bundles (`.zip`) |
| Basic portal blocks: text, stats, image, video, files, timeline | Chart blocks (interactive pages cover charts meanwhile) |
| "Last viewed" receipts | Detailed view/download analytics |
| Proposals view-only | Accept / approve, e-sign |

### Phase 0: Repo foundation (no design or hosting needed, can start now)
- [x] Scaffold Next.js 16 at the repo root, TypeScript strict, ESLint, Prettier
- [x] Docker MySQL for local dev, Drizzle schema + first migration (`inquiries`, `settings`)
- [x] `proxy.ts` hostname routing (`1880.io` / `hub.1880.io`), reserved names, `SITE_ROLE`
- [x] Staff sign-in (password + emailed link), owner/editor roles, rate limits, activity log, mail via Resend (D33)
- [x] Security headers, health check that includes the database (D34)
- [x] GitHub Actions CI: lint, typecheck, unit tests, build
- [x] Placeholder pages for all three surfaces
- [x] Portal subdomain as a setting (`PORTAL_SUBDOMAIN`, D18)

### Phase 1: Prototypes (Drew, in Claude Design)
- [x] ~~Public site prototype~~: replaced by the 1880consulting.com rebuild (D31)
- [ ] Client portal prototype (`docs/prototype-brief.md` §B)
- [ ] Hand off into `prototype/` + brand tokens into `design-system/`

### Phase 2: CMS core + public site (current focus)
- [x] Content engine (`src/cms/`, reusable): content types, blocks, entries, versions, drafts, publish (D35)
- [x] Block builder with live preview: add, reorder, hide, remove sections; forms from block schemas; desktop and phone preview; history and restore
- [x] Admin shell in the 1880 OS look, with placeholder sections
- [x] People + roles: invite, change role, remove access; your account (change password)
- [x] Rebuild of 1880consulting.com (D31): home + Contact, as blocks (hero, statement, feature, namesake, services, contact band) with zod schemas, content in `src/site/content.ts` until the CMS stores it
- [x] Collections: case studies, services (D38)
- [x] Automatic slug redirects
- [x] Media library + pipeline (D36), with an Image section
- [x] Menus + footer (D37)
- [x] SEO panel: share image, Google and share previews, hide from search (D39)
- [x] Contact form → inquiries inbox + email alert via Resend, recipients in Settings (D32). Emails go out once Resend is set up (§4.1, Phase 5)
- [x] SEO: metadata, JSON-LD, sitemap, share images, `llms.txt` (D39)
- [x] Analytics (GA4 since D45, switched on by env), accessibility, Lighthouse ≥ 95 (D40)

### Phase 3: Portal foundation
- [x] Clients and client people in the CMS, invites (D41)
- [x] Magic-link sign-in, client picker, sign-out, "Not found" handling
- [x] Portal shell, per-client logo/accent after sign-in (on the 1880 Design System; restyle from the portal prototype when it lands)
- [x] Demo client with sample data (`npm run portal:seed`; sample documents come with Phase 4)
- [x] **Isolation test suite passing** (gate for real data)

### Phase 4: Reports & proposals
- [x] Document editor: format 1 (portal blocks), format 2 (interactive page upload), format 3 (file upload) (D42)
- [x] Sandboxed full-screen viewer for interactive pages + its security policy (tested with a sample dashboard page)
- [ ] Try one real letswork page in the viewer (Drew: upload one to the demo client)
- [x] Publish to client, optional "new report" email
- [x] Portal home, document pages, downloads, print layout
- [x] "Last viewed" receipts in the CMS, preview as client

### Phase 5: Hosting & launch (when the client's Hostinger plan exists)
- [x] Ready in code (D43): runbook `docs/LAUNCH.md`, standalone `npm start`, staging `noindex` switch, redirect map for the current site
- [ ] Create the app, MySQL, env vars, GitHub auto-deploy; staging review with `SITE_INDEXING=off` (Drew, LAUNCH.md steps 1–4)
- [ ] GoDaddy DNS for `1880.io` (Drew, step 5)
- [ ] Resend: verify `1880consulting.com` as the sending domain (Drew adds the records, IT informed; step 6)
- [ ] Point `1880consulting.com`'s web records at Hostinger; the app redirects (Drew, step 7)
- [ ] Backups and uptime monitor on `/api/health` (Drew, step 9)
- [ ] Launch, then onboard the first real client (step 10)

---

## 6. Open questions

1. **Public site content:** pages, audience, main call to action. (The prototypes will answer most of this.)
2. **Sender details:** which address and name should site emails use (e.g. "1880 Consulting" `<notifications@1880consulting.com>`), and where should replies go?
3. **Client sign-in:** is a magic link fine for everyone at launch?
4. **Client URL names:** readable (`/acme`) is the default. Any clients whose name must stay discreet (e.g. a code name)?
5. **Who on the 1880 team needs CMS access**, and who is the owner?
6. **LTC Bodoni 175 on the web:** today's site loads it from an Adobe Fonts kit (`exu1qnt`). If 1880's Adobe Creative Cloud plan includes it, adding `1880.io` to that kit's web project would let the new site use it instead of Libre Bodoni (D17). Who owns that Adobe account? The same Adobe Fonts kit can serve Neue Haas Grotesk (D48): one kit, with `1880.io` and `hub.1880.io` added to its web project.

**Parked for later:** buying a web license for *LTC Bodoni 175 Pro* (D17).

---

## 7. Glossary

- **CMS:** the admin where the team edits content without touching code.
- **Block:** a pre-designed page section (hero, text, quote…) editors fill in. Layout and style stay locked to the brand.
- **Version:** a saved snapshot of a page or document. Lets you undo or roll back.
- **Tenant / client:** one client organization, with its own private area at `hub.1880.io/<name>`.
- **Magic link:** sign in by clicking a one-time link emailed to you.
- **Interactive page:** a custom, self-contained HTML landing page (like the letswork pages) uploaded as a portal document.
- **Sandboxed frame:** a locked-down window inside the portal page that runs an interactive page without giving it access to the portal.
- **Proxy (`proxy.ts`):** code that runs before every page, used to route by hostname and block wrong-site routes.
- **Migration:** a numbered, one-way database change applied automatically.
- **`noindex`:** tells Google not to list a page.
