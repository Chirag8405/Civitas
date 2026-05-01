import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

export const middleware = withAuth(
  function middleware(req: NextRequest) {
    return undefined; // Allow request to proceed (auth already checked below)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // /setup (step 1-3 onboarding) is always accessible to handle the landing flow
        if (pathname === "/setup") {
          return true;
        }

        // Require token for all dashboard + Act sub-pages
        if (
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/calendar") ||
          pathname.startsWith("/ballot") ||
          pathname.startsWith("/polling") ||
          pathname.startsWith("/setup/map") ||
          pathname.startsWith("/setup/voter-roll")
        ) {
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
