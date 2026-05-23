# KoaMessenger

A vibrant, privacy-focused all-in-one messaging hub web app (PWA) that embeds 44+ messaging platforms via iframe in a single beautiful interface.

## Run & Operate

- `pnpm --filter @workspace/koa-messenger run dev` — run the frontend (port 18802, path `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, path `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + Clerk Auth
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Auth: Clerk (email/password + Google OAuth)

## Where things live

- `artifacts/koa-messenger/` — React + Vite PWA frontend
  - `src/pages/` — home, dashboard, add-platforms, feedback, settings, not-found
  - `src/components/` — layout (sidebar nav), platform-icon, shadcn/ui components
  - `src/lib/queryClient.ts` — React Query client singleton
  - `public/manifest.json` — PWA manifest
- `artifacts/api-server/` — Express 5 API server
  - `src/routes/` — platforms, userPlatforms, users, feedback, notifications, health
  - `src/middlewares/clerkProxyMiddleware.ts` — Clerk proxy
- `lib/db/` — Drizzle ORM schema + migrations
  - Tables: platforms, users, userPlatforms, feedback, feedbackVotes, notificationPreferences
- `lib/api-spec/` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — generated React Query hooks (do not edit manually)

## Architecture decisions

- Platforms are rendered as sandboxed iframes (allow-scripts, allow-forms, allow-same-origin) — messages never pass through our servers
- Clerk handles auth; email is stored encrypted and never shown to other users
- All API routes are prefixed `/api` and share the same Express router
- React Query for data fetching with 5-minute stale time; cache cleared on Clerk user change
- Platform icons use react-icons/si + react-icons/fa with letter fallback for unknown platforms

## Product

- Landing page with privacy-first messaging pitch
- Clerk auth (email/password + Google) with custom #dc2350 branding
- Dashboard: sidebar with user's active platforms, iframe viewer for selected platform
- Add Platforms: browse/search all 44 seeded platforms with add/remove toggle
- Feedback: feature requests and platform suggestions with upvoting
- Settings: display name, appearance (light/dark/system), notification preferences, privacy info
- PWA installable on Mac and mobile

## User preferences

- Primary color: #dc2350, secondary: #e34f73
- Dark mode first design
- Logo: attached_assets/Logo_-_KoaMessenger_1779503500186.png

## Gotchas

- react-icons v5: `SiKakaotalk` (not SiKakaoTalk), `SiLinkedin` does not exist (use FaLinkedin), `SiSkype`/`SiViber` don't exist (use FaSkype/FaViber from react-icons/fa)
- Vite's dep bundle (`.vite/deps/react-icons_si.js`) is cached at build time — if you add new si icons, clear Vite cache or add them to the optimizeDeps
- API server must be rebuilt (restarted) to pick up route changes — it compiles to `dist/index.mjs`
- Never run `pnpm dev` at workspace root — use workflow restart or `pnpm --filter` commands

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
