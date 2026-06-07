import type { CorsOptions } from "cors";

/**
 * CORS origin allowlist.
 *
 * Replaces `origin: true` (which reflects ANY requesting origin while allowing
 * credentials). API auth here is Bearer-token, so reflecting all origins isn't
 * directly exploitable today — but it silently becomes a cross-site hole the
 * moment any cookie-based session is introduced. An explicit allowlist closes
 * that and costs nothing.
 *
 * Allowed:
 *  - requests with no Origin header (same-origin, curl, native/desktop shells)
 *  - exact origins listed in CORS_ALLOWED_ORIGINS (comma-separated)
 *  - localhost / 127.0.0.1 (any port) for local dev
 *  - the deployment platform's own domains (*.replit.app/.replit.dev/.repl.co)
 *
 * Everything else (e.g. https://attacker.example) is denied — cors simply omits
 * the Access-Control-Allow-Origin header, so the browser blocks the response.
 */
const STATIC_ALLOWED = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const PLATFORM_HOST_SUFFIXES = [".replit.app", ".replit.dev", ".repl.co"];

export function isAllowedOrigin(origin: string): boolean {
  if (STATIC_ALLOWED.has(origin)) return true;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1") return true;
  return PLATFORM_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

export const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    // No Origin header → not a cross-origin browser request; allow.
    if (!origin) return callback(null, true);
    return callback(null, isAllowedOrigin(origin));
  },
};
