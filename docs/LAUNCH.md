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

## 2. Create the Node.js app (Drew, in hPanel)

One app serves all three surfaces (`SITE_ROLE=all`). Splitting the public site and
the portal into two apps later is a settings change (PLAN §2.1).

| Setting | Value |
|---|---|
| Repository / branch | `1880consulting/1880`, `main` |
| Node.js version | 22 (matches `.nvmrc`) |
| Install + build command | `npm ci && npm run db:migrate && npm run build` |
| Start command | `npm start` |
| Auto-deploy | On, for pushes to `main` |

**Environment variables.** Hostinger replaces the whole list on every save and
can't show values back, so keep the full list in your password manager and paste
it whole each time.

| Variable | Staging value | Production value |
|---|---|---|
| `DATABASE_URL` | from step 1 | same |
| `SITE_URL` | the staging address Hostinger gives you, e.g. `https://xyz.hostingersite.com` | `https://1880.io` |
| `SITE_INDEXING` | `off` (keeps search engines out) | *(leave out)* |
| `SITE_ROLE` | `all` | `all` |
| `PORTAL_SUBDOMAIN` | `clients` (or the chosen name, PLAN open question 6) | same |
| `PORTAL_URL` | the staging portal address, if it isn't `SITE_URL` with the subdomain in front | *(leave out)* |
| `RESEND_API_KEY` | from step 6 (until then, leave out: sign-in links are shown in Studio or need a password) | same |
| `MAIL_FROM` | `1880 Consulting <notifications@1880consulting.com>` (PLAN open question 2) | same |
| `PLAUSIBLE_DOMAIN` | *(leave out)* | `1880.io`, once analytics is decided (open question 8) |

`SITE_URL` is built into pages, so changing it needs a rebuild (redeploy).

**Check:** open `<staging address>/api/health`. It should say
`{"ok":true,...,"migrations":{"ok":true,...}}`.

## 3. Create the first owner and the home page (Drew)

These run once, from a terminal that can reach the database: Hostinger's SSH
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

1. In hPanel, add `1880.io`, `www.1880.io` and `clients.1880.io` (or the chosen portal subdomain) to the app. Hostinger shows the address to point them at.
2. At GoDaddy, in the `1880.io` zone (new domain, nothing to preserve):

| Type | Name | Value |
|---|---|---|
| A | `@` | Hostinger's IP |
| CNAME | `www` | `1880.io` |
| A | `clients` | Hostinger's IP |

3. Wait for HTTPS certificates to appear in hPanel (minutes to a few hours).

**Check:** `https://1880.io/api/health` answers, `https://www.1880.io` goes to
`https://1880.io`, and `https://clients.1880.io` shows the portal's sign-in page.

## 6. Email through Resend (Drew, with a heads-up to IT)

1. Tell 1880's IT you're adding sending records for Resend on `1880consulting.com`; nothing of theirs changes. Ask whether their DMARC policy is strict.
2. At GoDaddy, **export the `1880consulting.com` zone** first (a backup).
3. Create a Resend account, add the domain `1880consulting.com`, and copy the records Resend lists (a DKIM `TXT` named like `resend._domainkey`, and an `MX` plus `TXT` on a `send` subdomain).
4. Add **only those** at GoDaddy. Edit nothing else.
5. When Resend says the domain is verified, create an API key and set `RESEND_API_KEY` (step 2), then redeploy.

**Check:** on `/admin/login`, ask for an email link to your own address. Then
submit the contact form and confirm the alert arrives (Settings lists who gets
it).

## 7. Launch (Drew)

1. In the app's settings: remove `SITE_INDEXING`, set `SITE_URL=https://1880.io`, redeploy.
2. In hPanel, also add `1880consulting.com` and `www.1880consulting.com` to the app.
3. At GoDaddy, in the `1880consulting.com` zone, change **only** the web records: `@` (A) and `www` to Hostinger. Mail records stay untouched.

The app redirects the old site for you (`src/lib/routing.ts`, `legacyPath`):

| Old address | New address |
|---|---|
| `1880consulting.com/` | `https://1880.io/` |
| `1880consulting.com/contact/` | `https://1880.io/contact` |
| Anything else (WordPress's sample page, "Hello world" post, author and category pages, feeds) | `https://1880.io/` |

**Check:** `https://1880consulting.com/contact/` lands on `https://1880.io/contact`,
and email to `@1880consulting.com` still arrives.

## 8. Search engines (Drew)

1. In Google Search Console, add `1880.io` and submit `https://1880.io/sitemap.xml`.
2. If `1880consulting.com` is in Search Console, use **Change of address** to `1880.io`.
3. Today's site uses Google Analytics (`G-FNXWW6CRNM`); the new site has Plausible ready (open question 8).

## 9. Keep it running (Drew)

- **Uptime:** a free monitor (UptimeRobot, Better Stack) on `https://1880.io/api/health` every 5 minutes, alerting your email. It fails if the database is down or a migration is missing.
- **Backups:** Hostinger backs up daily. Because images and client files live in MySQL too, a database export is a full backup. Once a month, download a database export from hPanel and keep it somewhere safe.
- **Updates:** merge to `main`, CI checks it, Hostinger deploys it. New migrations run during the build.

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
