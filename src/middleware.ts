import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

export const middleware = withAuth(
  function middleware(req: NextRequest) {
    return undefined; // Allow request to proceed (auth already checked below)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Authenticated users hitting /setup should go to /dashboard instead
        // (handled via redirect in the middleware function above — but since
        // withAuth can't redirect, we just gate: always allow /setup access,
        // and the page itself handles the phase-based onboarding flow)
        if (pathname === "/setup") {
          return true;
        }

        // Require token for all dashboard routes
        if (pathname.startsWith("/dashboard") || pathname.startsWith("/calendar") || pathname.startsWith("/ballot") || pathname.startsWith("/polling")) {
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
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
