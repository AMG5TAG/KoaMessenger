# Releasing the macOS desktop app

The macOS `.dmg` is built in CI by
[`.github/workflows/desktop-macos.yml`](../../.github/workflows/desktop-macos.yml)
on a real macOS runner (electron-builder can't produce a macOS `.app` from
Linux). The output is a **universal** binary (Apple Silicon + Intel), uploaded as
a build artifact on every run and attached to a GitHub Release.

## Cut a release (recommended: one click)

**Actions → Build macOS desktop app → Run workflow → pick `patch` / `minor` /
`major`.**

That single run:

1. Bumps `version` in `desktop/koa-messenger-desktop/package.json` on `main`.
2. Commits `Release vX.Y.Z` and pushes the matching `vX.Y.Z` tag.
3. Builds the universal `.dmg` named `KoaMessenger-X.Y.Z-universal.dmg`.
4. Signs + notarizes it **if the Apple secrets are set** (see below), then
   verifies the signature/notarization.
5. Publishes a GitHub Release with the `.dmg` attached and auto-generated notes.

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

## Building locally (Mac only)

```bash
cd desktop/koa-messenger-desktop
pnpm install
pnpm run package        # build + electron-builder → release/*.dmg
```

The local `package` script builds unsigned by default.
