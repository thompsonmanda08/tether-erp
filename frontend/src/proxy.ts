import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "./lib/auth";
import { AUTH_SESSION } from "./lib/constants";

// ============================================================================
// ROUTE CONFIGURATION
// Add routes to these arrays to control access
// ============================================================================

/**
 * Authentication routes - pages for login, registration, etc.
 * Users with valid session will be redirected away from these pages
 */
const AUTH_ROUTES = ["/login", "/register", "/otp", "/forgot-password", "/reset-password"];

/**
 * Public routes - accessible without authentication
 * Add any public-facing pages here (landing pages, verification, support, etc.)
 */
const PUBLIC_ROUTES = [
  "/",           // Landing page
  "/verify",     // Document verification (prefix match)
  "/support",    // Support page
  "/about",      // About page
];

/**
 * Admin routes - require admin role
 * These routes will verify the user's role before allowing access
 */
const ADMIN_ROUTES = ["/admin"];

/**
 * Static assets - skip middleware entirely for performance
 */
const STATIC_ASSET_PREFIXES = [
  "/web-app-manifest",
  "/favicon",
  "/_next",
  "/static",
  "/public",
  "/images",
  "/logo",
  "/manifest.json",
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if pathname matches any route in the list (supports prefix matching)
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => {
    // Exact match for routes without wildcards
    if (pathname === route) return true;
    // Prefix match for routes (e.g., "/verify" matches "/verify/DOC-123")
    if (pathname.startsWith(route + "/")) return true;
    return false;
  });
}

/**
 * Check if pathname starts with any prefix
 */
function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  const response = NextResponse.next();

  // Add security headers to all responses
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Skip middleware for static assets
  if (startsWithAny(pathname, STATIC_ASSET_PREFIXES)) {
    return response;
  }

  // Check cookie existence (fast check without JWT decryption)
  const hasAuthCookie = request.cookies.has(AUTH_SESSION);

  // Determine route type
  const isAuthPage = matchesRoute(pathname, AUTH_ROUTES);
  const isPublicPage = matchesRoute(pathname, PUBLIC_ROUTES);
  const isAdminRoute = startsWithAny(pathname, ADMIN_ROUTES);

  // If no auth cookie and not on auth page or public page, redirect to login
  if (!hasAuthCookie && !isAuthPage && !isPublicPage) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Role-based access control — decode JWT only when there is a session cookie
  // and the request targets a protected or admin page.
  if (hasAuthCookie && (isAdminRoute || !isAuthPage && !isPublicPage)) {
    try {
      const { isAuthenticated, role } = await verifySession();

      // super_admin belongs to the admin console only — block from frontend app
      if (isAuthenticated && role === "super_admin") {
        url.pathname = "/access-denied";
        return NextResponse.redirect(url);
      }

      // Admin routes require the admin role
      if (isAdminRoute && (!isAuthenticated || role !== "admin")) {
        url.pathname = "/access-denied";
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error("[Proxy] Session check failed:", error);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - public (static assets)
     * - favicon.ico, manifest.json (static files)
     * - image files and fonts
     */
    "/((?!api|_next/static|_next/image|public|favicon\\.ico|manifest\\.json|icon.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.svg|.*\\.ico|.*\\.woff|.*\\.woff2|.*\\.ttf|.*\\.eot).*)",
  ],
};
