# Launch runbook: 1880.io, 1880 Studio and the client portal

Everything in the code is ready. What's left needs the client's Hostinger plan
and Drew's hands on GoDaddy and Resend. Do the steps in order; each one says who
does it and how to check it worked.

**Rules that stay true the whole way (PLAN D3, D11, D16):** DNS stays at GoDaddy.
On `1880consulting.com`, only **add** Resend's records and, at launch, change only
the `@` and `www` **web** records. Its mail records (MX, SPF, DKIM, DMARC,
autodiscover) belong to 1880's IT and stay exactly as they are.

---

## 0. Before you start

- [ ] The client has bought a Hostinger plan with **Node.js web apps** and **MySQL** (Business or Cloud; PLAN §4.2), and given Drew access.
- [ ] GitHub is connected in Hostinger's hPanel, with access to `1880consulting/1880`.
- [ ] All feature branches are merged into `main`, and CI is green on `main`.

## 1. Create the database (Drew, in hPanel)

1. Create a MySQL database and user. **Choose your own strong password** (Hostinger's generated ones have caused trouble).
2. Note the host, database name, user and password. They make one setting:
   `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE`
   (If the password has symbols like `@` or `/`, URL-encode them.)

Everything lives in this one database: pages, images, client files, sign-ins. Its
backups are the site's backups (step 9).

## 2. Create the Node.js app for 1880.io (Drew, in hPanel)

Two apps run the same code from the same repo and share one database (PLAN D46):
this one serves the public site and Studio at `1880.io` (`SITE_ROLE=public`); the
second serves the client portal at `hub.1880.io` (step 2b).

| Setting | Value |
|---|---|
| Repository / branch | `1880consulting/1880`, `main` |
| Node.js version | 22 (matches `.nvmrc`) |
| Build command | `npm run build` (Hostinger's Next.js setting; it applies database migrations first, then builds) |
| Start command | `npm start` |
| Auto-deploy | On, for pushes to `main` |

**Environment variables.** Hostinger replaces the whole list on every save and
can't show values back, so keep the full list in your password manager and paste
it whole each time. Ready-made lists for both apps, without the password, are in
`deploy/hostinger/` (`public.env.example`, `hub.env.example`).

| Variable | Staging value | Production value |
|---|---|---|
| `DATABASE_URL` | from step 1 | same |
| `SITE_URL` | the staging address Hostinger gives you, e.g. `https://xyz.hostingersite.com` | `https://1880.io` |
| `SITE_INDEXING` | `off` (keeps search engines out) | *(leave out)* |
| `SITE_ROLE` | `public` | `public` |
| `PORTAL_SUBDOMAIN` | `hub` | same |
| `PORTAL_URL` | the staging portal address, if it isn't `SITE_URL` with the subdomain in front | *(leave out)* |
| `RESEND_API_KEY` | from step 6 (until then, leave out: sign-in links are shown in Studio or need a password) | same |
| `MAIL_FROM` | `1880 Consulting <notifications@1880consulting.com>` (PLAN open question 2) | same |
| `GA_MEASUREMENT_ID` | *(leave out)* | `G-FNXWW6CRNM` (Google Analytics 4, the same property as today's site) |

`SITE_URL` is built into pages, so changing it needs a rebuild (redeploy). Write
it with `https://`; the app adds it if it's missing.

**Check:** open `<staging address>/api/health`. It should say
`{"ok":true,...,"migrations":{"ok":true,...}}`.

## 2b. Create the Node.js app for hub.1880.io (Drew, in hPanel)

The same steps as step 2, with a second Node.js app:

| Setting | Value |
|---|---|
| Repository / branch | `1880consulting/1880`, `main` (the same as the first app) |
| Node.js version | 22 |
| Build command | `npm run build` |
| Start command | `npm start` |
| Domain | `hub.1880.io` |

Its environment variables are the first app's, with three differences:

| Variable | Value | Why |
|---|---|---|
| `SITE_ROLE` | `portal` | This app serves only the client portal |
| `SKIP_MIGRATIONS` | `1` | The first app updates the shared database; two apps doing it at once could collide |
| `GA_MEASUREMENT_ID` | *(leave out)* | The portal is private: no analytics |

Keep `DATABASE_URL`, `SITE_URL=https://1880.io`, `PORTAL_SUBDOMAIN=hub`,
`RESEND_API_KEY` and `MAIL_FROM` the same as the first app's.

When both apps deploy from the same push, the hub app may finish first and see a
database the first app hasn't updated yet. If the hub build fails right after a
push that added a migration, redeploy the hub once the first app is done.

**Check:** `https://hub.1880.io` shows the portal's sign-in page and
`https://hub.1880.io/api/health` says `"ok":true`.

## 3. Create the first owner and the home page (Drew)

**In the browser (easiest):**

1. Add `STUDIO_SETUP_TOKEN` to the 1880.io app's variables: a long random code (at least 24 characters; your variables file has one). Redeploy.
2. Open `https://1880.io/admin/setup`, enter that code, your name, email and a password. You're signed in as the owner, and today's home page is loaded into Studio so you can edit it.
3. The setup page then disappears for good (it only exists while Studio has no owner). Remove `STUDIO_SETUP_TOKEN` from the variables and redeploy.

**Or from a terminal** that can reach the database: Hostinger's SSH
terminal (in the app's folder), or your own computer with `DATABASE_URL` pointed
at the production database (turn on remote MySQL access for your IP in hPanel
first, and turn it off again after).

```bash
npm run studio:owner -- --email you@1880consulting.com --name "Your Name"
```

```bash
npm run cms:seed
```

The first prints a one-time link to set your password. The second puts today's
home page into the CMS. Then sign in at `<address>/admin`, invite the team
(People), and add case studies, services and menus.

## 4. Review on staging (Drew + team)

- [ ] Click through the site, Studio and the portal (`npm run portal:seed` adds a demo client and prints a sign-in link; archive the demo client in Studio before launch).
- [ ] Upload one real letswork interactive page to the demo client and check it works in the portal's viewer (PLAN Phase 4).
- [ ] Run the quality check from your computer: `npm run audit -- https://<staging address>`. Every page should pass.
- [ ] `https://securityheaders.com` on the staging address: expect an A.

## 5. DNS for 1880.io (Drew, at GoDaddy)

1. In hPanel, add `1880.io` and `www.1880.io` to the first app, and `hub.1880.io` to the hub app. Hostinger shows the address to point each at.
2. At GoDaddy, in the `1880.io` zone (new domain, nothing to preserve):

| Type | Name | Value |
|---|---|---|
| A | `@` | Hostinger's IP |
| CNAME | `www` | `1880.io` |
| A | `hub` | the hub app's IP (often the same) |

3. Wait for HTTPS certificates to appear in hPanel (minutes to a few hours).

**Check:** `https://1880.io/api/health` answers, `https://www.1880.io` goes to
`https://1880.io`, and `https://hub.1880.io` shows the portal's sign-in page.

## 6. Email through Resend (Drew, with a heads-up to IT)

1. Tell 1880's IT you're adding sending records for Resend on `1880consulting.com`; nothing of theirs changes. Ask whether their DMARC policy is strict.
2. At GoDaddy, **export the `1880consulting.com` zone** first (a backup).
3. Create a Resend account, add the domain `1880consulting.com`, and copy the records Resend lists (a DKIM `TXT` named like `resend._domainkey`, and an `MX` plus `TXT` on a `send` subdomain).
4. Add **only those** at GoDaddy. Edit nothing else.
5. When Resend says the domain is verified, create an API key and set `RESEND_API_KEY` (step 2), then redeploy.

**Check:** on `/admin/login`, ask for an email link to your own address. Then
submit the contact form and confirm the alert arrives (Settings lists who gets
it).

## 7. Launch, and move 1880consulting.com (Drew)

1. In both apps' settings: remove `SITE_INDEXING`, check `SITE_URL=https://1880.io`, redeploy.
2. In hPanel, add `1880consulting.com` and `www.1880consulting.com` to the **1880.io** app as extra domains (Hostinger may call them alias or parked domains). Hostinger then shows where to point them, and issues their HTTPS certificates once DNS points there.
3. At GoDaddy, **export the `1880consulting.com` zone** first (a backup). Then, in that zone, change **only** these two web records:

| Type | Name | Change to |
|---|---|---|
| A | `@` | the 1880.io app's IP from hPanel (today `76.13.207.80`; confirm in hPanel) |
| CNAME | `www` | `1880consulting.com` (or an A record to the same IP, if `www` is an A record today) |

   MX, the SPF and DMARC `TXT` records, DKIM, `autodiscover` and anything else mail-related stay exactly as they are. If GoDaddy's "Forwarding" is switched on for the domain, turn it off; the app does the redirect.

The app redirects the old site for you (`src/lib/routing.ts`, `legacyPath`):

| Old address | New address |
|---|---|
| `1880consulting.com/` | `https://1880.io/` |
| `1880consulting.com/contact/` | `https://1880.io/contact` |
| Anything else (WordPress's sample page, "Hello world" post, author and category pages, feeds) | `https://1880.io/` |

**Check:** `https://1880consulting.com/contact/` lands on `https://1880.io/contact`,
and email to `@1880consulting.com` still arrives.

## 8. Search engines and analytics (Drew)

1. In Google Search Console, add `1880.io` as a **Domain** property. Google gives you a `TXT` record; add it to the `1880.io` zone at GoDaddy (a new domain, so nothing to preserve). A Domain property covers `www` and `hub` too.
2. Submit `https://1880.io/sitemap.xml` under Sitemaps.
3. After the redirect in step 7 is live, open the `1880consulting.com` property and use **Settings → Change of address** to `1880.io`. It tells Google the site moved, so its ranking carries over.
4. Analytics: set `GA_MEASUREMENT_ID=G-FNXWW6CRNM` on the 1880.io app (step 2), the same GA4 property as today's site, so the history continues. Once it's live, check GA4's Realtime report while you browse the site. The contact form sends a `generate_lead` event; copying the email address sends `copy_email`.

## 9. Keep it running (Drew)

- **Uptime:** a free monitor (UptimeRobot, Better Stack) on `https://1880.io/api/health` every 5 minutes, alerting your email. It fails if the database is down or a migration is missing.
- **Backups:** Hostinger backs up daily. Because images and client files live in MySQL too, a database export is a full backup. Once a month, download a database export from hPanel and keep it somewhere safe.
- **Updates:** merge to `main`, CI checks it, Hostinger deploys it. New migrations run during the build.

## 9b. Hostinger's CDN (Drew)

Safe to switch on for both apps. What it will and won't keep:

- **Public pages** (1880.io): kept for up to 60 seconds, so a change you publish in Studio shows for everyone within about a minute. If you need it sooner, purge the CDN cache in hPanel.
- **Images, fonts, scripts and styles**: kept for a year. Their addresses change whenever their content does, so they never go stale.
- **Studio, sign-in pages and the whole hub**: never kept (they're marked private), so nobody sees someone else's page.

**Check after switching it on:** publish a small change in Studio and reload the
page a minute later; sign in to the hub in two different browsers as two
different people and confirm each sees only their own client.

## 10. The first real client (Drew)

- [ ] The isolation tests pass on `main` (they run in CI on every change: PLAN §2.3 point 8).
- [ ] In Studio: Clients → Add a client (decide the URL name; a code name if they need to stay discreet, open question 4).
- [ ] Invite their people. Each gets an email with a link that signs them in.
- [ ] Create their first document, publish it with "Email … people" ticked.
- [ ] Check "Who opened it" on the document a day later.

---

## What's already in place (for the security review)

- Security headers on every response (`src/lib/security-headers.ts`): a strict Content Security Policy, no framing except Studio's own preview and the portal's document viewer, HSTS for two years, no sniffing, a tight Permissions-Policy.
- Studio: hashed passwords (scrypt), hashed session and link tokens, host-only `__Host-` cookies, sign-in rate limits, an activity log, one-time links confirmed with a click (email scanners can't use them up).
- Portal: access checked in the proxy before any page renders, and again in every page; every query filtered by client; the same Not found for "unknown" and "not yours"; separate host-only cookie; private, uncached files; interactive pages sandboxed without `allow-same-origin`, under their own policy; isolation tests in CI.
- Nothing is written to the server's disk; everything is in MySQL.
- `npm audit --omit=dev`: no known vulnerabilities (Nov 10, 2026).
