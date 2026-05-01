import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

export const middleware = withAuth(
  function middleware(req: NextRequest) {
    // Middleware runs for all protected routes
    // Auth check is handled by withAuth
    return undefined; // Allow request to proceed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to /setup even without full session
        if (req.nextUrl.pathname === "/setup") {
          return true;
        }

        // Require token for /dashboard routes
        if (req.nextUrl.pathname.startsWith("/dashboard")) {
          return !!token;
        }

        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
