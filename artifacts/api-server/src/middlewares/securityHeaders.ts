import type { NextFunction, Request, Response } from "express";

/**
 * Baseline security headers for this JSON API.
 *
 * The server only ever responds with JSON (never HTML), so the headers are
 * tuned for an API surface rather than a document one: deny framing and lock
 * down the CSP entirely (a JSON response should never load resources), prevent
 * MIME sniffing, and advertise HSTS. This intentionally avoids pulling in a
 * full HTML-oriented header library — there is no markup to protect.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  // No browsing context should ever embed or execute anything from API responses.
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  // 2 years, includeSubDomains. Browsers ignore this over plain HTTP, so it is
  // safe to always send; it only takes effect once served over HTTPS.
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  next();
}
