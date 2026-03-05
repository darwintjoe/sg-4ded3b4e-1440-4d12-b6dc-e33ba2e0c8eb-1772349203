import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Scopes for Google API access
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.events",
];

/**
 * Get the base URL for NextAuth callbacks
 * Priority: NEXTAUTH_URL env var > request headers > fallback
 */
function getBaseUrl(req: NextApiRequest): string {
  // 1. If NEXTAUTH_URL is explicitly set, use it
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // 2. Try to construct from request headers
  try {
    // Check for forwarded headers (used by proxies/load balancers)
    const forwardedHost = req.headers["x-forwarded-host"];
    const forwardedProto = req.headers["x-forwarded-proto"];
    const host = req.headers.host;

    // Get the host value
    const hostValue = forwardedHost 
      ? (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
      : host;

    if (!hostValue) {
      console.warn("[NextAuth] No host header found, using fallback");
      return "http://localhost:3000";
    }

    // Determine protocol
    let protocol = "https";
    if (forwardedProto) {
      protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
    } else if (hostValue.includes("localhost") || hostValue.startsWith("127.")) {
      protocol = "http";
    }

    const url = `${protocol}://${hostValue}`;
    
    // Validate the URL
    new URL(url);
    
    return url;
  } catch (error) {
    console.error("[NextAuth] Error constructing URL from headers:", error);
    return "http://localhost:3000";
  }
}

/**
 * NextAuth configuration
 */
function createAuthOptions(baseUrl: string): NextAuthOptions {
  return {
    providers: [
      GoogleProvider({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        authorization: {
          params: {
            scope: SCOPES.join(" "),
            access_type: "offline",
            prompt: "consent",
            response_type: "code",
          },
        },
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET || "sellmore-pos-secret-key-2026",
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiresAt = account.expires_at;
          token.scope = account.scope;
        }

        // Check if token is still valid
        if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
          return token;
        }

        // Try to refresh the token
        if (token.refreshToken) {
          try {
            const response = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
              }),
            });

            const tokens = await response.json();

            if (!response.ok) {
              throw tokens;
            }

            return {
              ...token,
              accessToken: tokens.access_token,
              expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
              refreshToken: tokens.refresh_token ?? token.refreshToken,
            };
          } catch (error) {
            console.error("[NextAuth] Error refreshing access token:", error);
            return { ...token, error: "RefreshAccessTokenError" };
          }
        }

        return token;
      },
      async session({ session, token }) {
        return {
          ...session,
          accessToken: token.accessToken as string | undefined,
          refreshToken: token.refreshToken as string | undefined,
          expiresAt: token.expiresAt as number | undefined,
          scope: token.scope as string | undefined,
          error: token.error as string | undefined,
        };
      },
    },
    pages: {
      signIn: "/",
      error: "/",
    },
    debug: process.env.NODE_ENV === "development",
  };
}

/**
 * NextAuth API handler
 */
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Get base URL and set it for NextAuth
  const baseUrl = getBaseUrl(req);
  
  // Set NEXTAUTH_URL for this request
  process.env.NEXTAUTH_URL = baseUrl;

  if (process.env.NODE_ENV === "development") {
    console.log("[NextAuth] Using URL:", baseUrl);
    console.log("[NextAuth] Headers:", {
      host: req.headers.host,
      forwardedHost: req.headers["x-forwarded-host"],
      forwardedProto: req.headers["x-forwarded-proto"],
    });
  }

  return NextAuth(req, res, createAuthOptions(baseUrl));
}