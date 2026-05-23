# KoaMessenger Desktop

Electron shell for KoaMessenger that bypasses the two biggest limits of the web build:

1. **Embeds platforms that block iframes** (WhatsApp, Slack, Discord, Gmail, etc.) by stripping `X-Frame-Options` and `frame-ancestors` CSP directives on `<webview>` responses.
2. **True multi-account isolation** — each tab gets its own persistent partition (`persist:plat-{id}-tab-{n}`), so cookies/localStorage are completely separated. Log into three WhatsApp accounts at once.

## Why this isn't in Replit's preview

Electron needs a desktop OS to launch. Replit runs in a headless Linux container, so this package builds and typechecks here, but you run it on your own machine.

## Run it locally

```bash
git clone <your-repo>
cd <repo>
pnpm install

# Terminal 1 — start the existing web app
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/koa-messenger run dev

# Terminal 2 — start the desktop shell (points at http://localhost:18802 by default)
pnpm --filter @workspace/koa-messenger-desktop run dev
```

Override the URL with `KOA_DEV_URL=https://your-deployed-app.replit.app pnpm dev` to point the shell at a published deployment instead of your local dev server.

## Package for distribution

```bash
pnpm --filter @workspace/koa-messenger-desktop run package
```

This produces installers in `desktop/koa-messenger-desktop/release/` (DMG on macOS, NSIS .exe on Windows, AppImage on Linux). You need to run the package command on the target OS — cross-compilation requires extra setup.

## How the renderer integrates

The React app detects `window.koaDesktop?.isElectron` and switches the Dashboard from `<iframe>` to `<webview>` automatically. No code change needed on your side once you're inside the shell.

## Files

- `src/main.ts` — main process, header stripping, window setup
- `src/preload.ts` — exposes `window.koaDesktop` to the renderer
- `scripts/build.mjs` — esbuild bundler for main + preload
