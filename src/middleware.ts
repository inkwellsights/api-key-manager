import { NextRequest, NextResponse } from "next/server";

/**
 * Constant-time string comparison using an XOR-accumulator.
 * Pads both strings to the same length so length differences don't short-circuit.
 * Uses only edge-compatible Web APIs (no Node crypto.timingSafeEqual).
 */
function timingSafeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  // Pad to equal length so we always do the same number of iterations
  const aPadded = a.padEnd(maxLen, "\0");
  const bPadded = b.padEnd(maxLen, "\0");
  let diff = 0;
  for (let i = 0; i < maxLen; i++) {
    diff |= aPadded.charCodeAt(i) ^ bPadded.charCodeAt(i);
  }
  // diff === 0 only if every char matched AND lengths were equal
  return diff === 0 && a.length === b.length;
}

export function middleware(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;

  // Gate is DISABLED when DASHBOARD_PASSWORD is unset or empty — allows local dev
  if (!password) {
    return NextResponse.next();
  }

  const expectedUser = process.env.DASHBOARD_USER ?? "admin";

  const authHeader = req.headers.get("authorization") ?? "";

  if (authHeader.startsWith("Basic ")) {
    const encoded = authHeader.slice("Basic ".length);
    let decoded: string;
    try {
      // atob is edge-compatible; Buffer is Node-only and not available on the edge
      decoded = atob(encoded);
    } catch {
      // Invalid base64 — fall through to 401
      decoded = "";
    }
    const colonIdx = decoded.indexOf(":");
    if (colonIdx !== -1) {
      const user = decoded.slice(0, colonIdx);
      const pass = decoded.slice(colonIdx + 1);
      if (timingSafeEqual(user, expectedUser) && timingSafeEqual(pass, password)) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="API Key Manager", charset="UTF-8"`,
    },
  });
}

export const config = {
  /**
   * Run middleware on every route EXCEPT:
   *   /api/*           — /api/data must stay open for Bearer-auth API consumers
   *   /_next/static    — static assets
   *   /_next/image     — image optimization
   *   /favicon.ico     — browser favicon
   *   /icons/*         — PWA icons
   *   /manifest.json   — PWA manifest
   *   /sw.js           — service worker
   *   /robots.txt      — search engine crawler
   *
   * Next.js server actions POST to the page routes (not /api), so they ARE
   * covered by this matcher and thus gated alongside the dashboard UI.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|robots.txt).*)",
  ],
};
