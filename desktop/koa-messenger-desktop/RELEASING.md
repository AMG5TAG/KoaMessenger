# Releasing the desktop apps

The desktop installers are built in CI by
[`.github/workflows/desktop-macos.yml`](../../.github/workflows/desktop-macos.yml)
on native runners (electron-builder can't cross-build a macOS `.app` from Linux):

- **macOS** — a **universal** `.dmg` (Apple Silicon + Intel), signed + notarized
  when the Apple secrets are set (else unsigned).
- **Windows** — an **NSIS** `.exe` installer (x64), currently unsigned
  (SmartScreen warns on first run until a code-signing cert is added).
- **Linux** — an **AppImage** (x64).

All are attached to the same GitHub Release. The workflow opens the release as a
**draft**, builds the platforms in parallel, uploads each installer, and only
makes the release public once **every** build succeeds — so a half-built release
never goes live.

## Cut a release (recommended: one click)

**Actions → Build macOS desktop app → Run workflow → pick `patch` / `minor` /
`major`.**

That single run:

1. Bumps `version` in `desktop/koa-messenger-desktop/package.json` on `main`.
2. Commits `Release vX.Y.Z` and pushes the matching `vX.Y.Z` tag.
3. Builds `KoaMessenger-X.Y.Z-universal.dmg` (macOS) and
   `KoaMessenger Setup X.Y.Z.exe` (Windows).
4. Signs + notarizes the macOS build **if the Apple secrets are set** (see
   below), then verifies the signature/notarization.
5. Publishes a GitHub Release with both installers attached and auto-generated
   notes.

You never edit the version by hand — `package.json`, the git tag, and the `.dmg`
filename always stay in sync.

### Manual tag (re-release without a bump)

```bash
git tag v1.2.3 && git push origin v1.2.3
```

Builds & publishes a Release for that exact tag, assuming `package.json` already
matches. No version bump.

> Note: tags pushed by CI's `GITHUB_TOKEN` don't re-trigger the workflow, so the
> automated path never causes a double build.

## Code-signing & notarization

Signing + notarization run **automatically when these repository secrets exist**
(Settings → Secrets and variables → Actions). Without them the build still
succeeds but is **unsigned** — macOS Gatekeeper blocks first launch, and the user
must right-click → Open (or run
`xattr -dr com.apple.quarantine /Applications/KoaMessenger.app`).

| Secret | What it is |
| --- | --- |
| `MAC_CSC_LINK` | base64 of the **Developer ID Application** `.p12` certificate |
| `MAC_CSC_KEY_PASSWORD` | password the `.p12` was exported with |
| `APPLE_API_KEY_P8_BASE64` | base64 of the App Store Connect API `.p8` key |
| `APPLE_API_KEY_ID` | the API key's Key ID |
| `APPLE_API_ISSUER` | the API key's Issuer ID |

Requires a paid **Apple Developer Program** membership.

### Getting the certificate (`.p12`)

On a Mac: Xcode → Settings → Accounts → your Apple ID → **Manage Certificates →
+ → Developer ID Application**. Then in **Keychain Access**, right-click the
"Developer ID Application: …" cert → **Export** as `.p12` with a password.

```bash
base64 -i developer-id.p12 | pbcopy   # value for MAC_CSC_LINK
```

### Getting the App Store Connect API key (`.p8`)

[App Store Connect](https://appstoreconnect.apple.com) → Users and Access →
Integrations → **App Store Connect API → Team Keys → +**, role **Developer**.
Download the `.p8` (one-time download) and note the **Key ID** and **Issuer ID**.

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy   # value for APPLE_API_KEY_P8_BASE64
```

### Adding the secrets

```bash
gh secret set MAC_CSC_LINK            --repo AMG5TAG/KoaMessenger
gh secret set MAC_CSC_KEY_PASSWORD    --repo AMG5TAG/KoaMessenger
gh secret set APPLE_API_KEY_P8_BASE64 --repo AMG5TAG/KoaMessenger
gh secret set APPLE_API_KEY_ID        --repo AMG5TAG/KoaMessenger
gh secret set APPLE_API_ISSUER        --repo AMG5TAG/KoaMessenger
```

Notarization adds roughly 2–10 minutes per release (Apple's notary round-trip).

## How the build verifies itself

When a build is signed, CI runs `codesign --verify --deep --strict`,
`spctl --assess --type execute` (Gatekeeper acceptance, needs a valid
notarization ticket), and `xcrun stapler validate` on the `.dmg`. If any fail,
the run fails **before** publishing, so a broken `.dmg` is never released.

## Auto-update

Installed apps update themselves via
[`electron-updater`](https://www.electron.build/auto-update), pointed at this
repo's GitHub Releases (`build.publish` in `package.json`). On launch (and every
6 hours) the app checks for a newer published release, downloads it in the
background, and installs it on the next quit; a notification offers an immediate
restart.

For this to work, each release must carry the **update metadata** that CI
uploads next to the installers:

- macOS: `*-mac.zip` + `latest-mac.yml` (+ `.blockmap`) — macOS updates from the
  zip, not the `.dmg`.
- Windows: the NSIS `.exe` + `latest.yml` (+ `.blockmap`).
- Linux: the `.AppImage` + `latest-linux.yml` (+ `.blockmap`).

The CI upload steps fail loudly if `latest*.yml` is missing, so a release can't
silently ship without a working update feed.

**Platform caveat:** macOS auto-update requires a **code-signed** app
(Squirrel.Mac won't update an unsigned build). Until the Apple signing secrets
are set, the macOS check just errors and is swallowed — no user-facing error, but
no auto-update either. Windows auto-updates even while unsigned. Auto-update is
also a no-op in development (`!app.isPackaged`).

## Building locally (Mac only)

```bash
cd desktop/koa-messenger-desktop
pnpm install
pnpm run package        # build + electron-builder → release/*.dmg
```

The local `package` script builds unsigned by default.
