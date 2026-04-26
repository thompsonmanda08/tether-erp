import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
];

// Define routes that should redirect to login if not authenticated
const PROTECTED_ROUTES = [
  "/admin",
  "/dashboard", // Legacy route
];

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route.endsWith("*")) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route || pathname.startsWith(route + "/");
  });
}

/**
 * Check if a path is a protected route
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(route + "/");
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For root path, redirect to login if not authenticated, otherwise to dashboard
  if (pathname === "/") {
    try {
      const { isAuthenticated } = await verifyAdminSession();

      if (isAuthenticated) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } catch (error) {
      console.error("Middleware auth check failed:", error);
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Check authentication for protected routes
  if (isProtectedRoute(pathname)) {
    try {
      const { isAuthenticated } = await verifyAdminSession();

      if (!isAuthenticated) {
        // Store the attempted URL to redirect after login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    } catch (error) {
      console.error("Middleware auth check failed:", error);
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
