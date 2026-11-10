# 1880 OS (CMS admin look)

1880 OS is the interface the 1880 team works in. 1880 Studio (the CMS at `1880.io/admin`) uses it (PLAN D30). The public site uses the **1880 Design System** instead (Bodoni, black and white): see `design-system/tokens.css`.

Source of truth: the 1880 OS design system artifact, https://claude.ai/artifact/3v3y6Zh7fSP6zQZXs744t7 (v1.0, Oct 31 2026). Read its README for principles, voice, color and component rules.

## What's here

| File | What |
|---|---|
| `tokens.json` | Copied unchanged from the design system |
| `tokens.css` | **Generated** by `npm run tokens:os`. Every token as a `--os-*` CSS variable, scoped to `[data-os]` so it never touches the public site |
| `fonts/` | Inter variable font (Latin + Latin Extended), with its OFL license |
| `logo/` | The 1880 mark, white and black, drawn from the design system's own paths |

## Updating

1. Copy the new `tokens.json` from the design system over this one.
2. Run `npm run tokens:os`.
3. Check `/admin` in light and dark.

## How the admin uses it

- `src/cms/ui/` holds the admin building blocks (`AppShell`, `PageHeader`, `EmptyState`). They read only `--os-*` variables.
- Icons: Tabler Icons 3.49.0 (`@tabler/icons-react`), outline, 2px stroke, as the design system specifies.
- Light and dark follow the system setting. Setting `data-theme="light"` or `"dark"` on the `[data-os]` element overrides it.
- We don't load the design system's Tabler/Bootstrap stylesheet or React bundle. Components are rebuilt in CSS Modules to the same tokens and rules, so the admin stays small and works with Next.js server components.
