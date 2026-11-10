# Prototype brief (for Claude Design)

Two clickable prototypes get built before any production code: **A. the public site** (`1880.io`) and **B. the client portal** (`hub.1880.io/<client>`). Once approved, they become the visual and behavioral spec.

The CMS admin doesn't need its own prototype. It uses the 1880 OS design system (PLAN D30, `design-system/1880-os/`).

The portal lives at `hub.1880.io` (PLAN D44).

---

## How to make the prototypes hand off cleanly

1. **Build in reusable sections.** Every horizontal band of a page (hero, text, image + text, stats, quote, logo wall, case-study grid, FAQ, call to action…) becomes a CMS block. Reuse the same few section designs across pages rather than designing every page from scratch. Fewer, stronger blocks means an easier CMS.
2. **Give each section a visible name** in the prototype (a small label or a layer name like `Block: Stats`), so the build can map it 1:1.
3. **Use realistic content lengths** (a long headline, a short one, a 3-item and a 6-item grid). Editors will type anything; the design should survive it.
4. **Show both widths:** desktop (~1280px) and phone (~390px).
5. **Show states**, not just the happy path: empty, loading, error, hover/focus.
6. **Start from the existing 1880 design system** (tokens v2; web layer in `letswork-jmg/public/1880/assets/brand/1880.css`, logos and Libre Bodoni fonts beside it): monochrome charcoal/white, one Bodoni serif (use the free **Libre Bodoni**; the paid LTC Bodoni 175 is for later), square corners, hairline rules instead of shadows, `//` labels, an "ink" dark theme for bands. Any change to it (new color, size, radius) should be deliberate and written down, because these become the `design-system/` tokens.
7. **Hand-off format:** export each prototype as a self-contained HTML file (or share the Claude Design project link) and drop it in `prototype/public/` and `prototype/portal/`. Include the logo files and any photos you used.

---

## A. Public site (`1880.io`)

> **On hold (PLAN D31).** The public site starts as a rebuild of today's 1880consulting.com. Use this section later, for new pages or a redesign.

### Pages
| Page | Notes |
|---|---|
| Home | Hero, what 1880 does, proof (logos/results/quotes), featured work, call to action |
| About | Story, approach, values |
| Services | Overview + a template for a single service page |
| Work / case studies | Listing (with filters if useful) + a case-study detail template |
| Insights / news | *Optional.* Not a CMS collection in v1 (PLAN D23); design it only if you want it for later |
| Team | *Optional.* Not a CMS collection in v1 (PLAN D23); can be a normal page built from blocks |
| Contact | Form (name, email, company, message, maybe "what do you need help with"), success state, error state |
| Client sign-in link | Small link in the header or footer to `hub.1880.io` |
| Privacy | Plain legal text page |
| 404 | Friendly not-found page |

### Site-wide
- Header (desktop + mobile menu), footer
- Buttons, links, form fields with errors, tags, cards
- Image treatments (full-bleed, framed, with caption)
- Motion: keep it understated, and say what should happen with reduced motion

---

## B. Client portal (`hub.1880.io`)

Clients can only **view and download**. Only the 1880 team adds content.

### Screens
| Screen | Notes |
|---|---|
| Sign in | Email field → "Check your email" confirmation. **No client names or logos here** (it stays generic so client names stay private) |
| Link expired / invalid | Clear message + "Send a new link" |
| Client picker | Only for people who belong to more than one client |
| Client home | Welcome, the client's logo/accent (shown after sign-in), latest documents, maybe "What's new since your last visit" |
| Documents list | All reports and proposals, filter by type, sort by date, search |
| Document, CMS-built | Long-form layout from portal blocks: headings, rich text, stat tiles, image, embedded video, timeline/milestones, file list. Print-friendly. Used for routine reports **and** proposals (cover, sections, scope table, terms) |
| Document, interactive page | How a custom letswork-style page sits in the portal: full-screen, with a slim portal bar on top (back to documents, sign out). The page itself is designed separately for each client, so the prototype only needs the frame plus one example page |
| Document, file | PDF viewer + download button, and how files look in a list |
| Account | Name, email, sign out |
| Not found | One plain page for "doesn't exist" **and** "not yours" |
| Empty state | A brand-new client with no documents yet |

### Portal-wide
- Portal header (1880 mark + client logo/name after sign-in, account menu)
- Phone layout for every screen: clients will open links from email on their phones
- How per-client branding works: probably just the client's logo and one accent color on top of 1880's design

---

Proposals are **view-only** (no accept or e-sign flow). Keep v1 lean.

---

## C. Interactive pages (ongoing, per client)

These are made one at a time for each report, not in the prototype phase. Rules so they drop into the portal without changes:

- **One self-contained HTML file:** CSS, JavaScript and images embedded (base64 or inline SVG), the way the letswork pages embed their images. No links to other files by relative path.
- **Outside resources** only from the allow-list (fonts, one charting library CDN). Nothing else will load.
- **No sign-in, cookies or storage logic** in the page. The portal handles access. `localStorage` may not be available.
- **Responsive** (390px to 1440px+), **reduced-motion** friendly, readable when printed if possible.
- **Use the 1880 design system** unless the client's own brand is the point.
- Keep files reasonably small (aim for under ~15 MB; compress images to WebP first).

---

## Questions the prototypes should help answer
- What's the main call to action on the public site?
- Which sections repeat across pages? Those are the blocks.
- Which portal blocks do CMS-built reports really need beyond the basic set?
