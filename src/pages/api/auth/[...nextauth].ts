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
 * Dynamically detect the base URL from request headers
 * This allows the app to work on any domain without manual configuration
 */
function getBaseUrl(req: NextApiRequest): string {
  // Check for forwarded headers (used by proxies/load balancers)
  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedProto = req.headers["x-forwarded-proto"];
  
  // Get the host header
  const host = forwardedHost || req.headers.host;
  
  if (!host) {
    // Fallback to environment variable or localhost
    return process.env.NEXTAUTH_URL || "http://localhost:3000";
  }
  
  // Determine protocol
  let protocol = "https";
  if (forwardedProto) {
    protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  } else if (typeof host === "string" && host.includes("localhost")) {
    protocol = "http";
  }
  
  const hostString = Array.isArray(host) ? host[0] : host;
  return `${protocol}://${hostString}`;
}

/**
 * Create auth options with dynamic URL
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
        
        // Check if token needs refresh
        if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
          return token;
        }
        
        // Refresh the token
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
            console.error("Error refreshing access token:", error);
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
 * Dynamic NextAuth handler that sets NEXTAUTH_URL based on request
 */
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Dynamically set NEXTAUTH_URL from request headers
  const baseUrl = getBaseUrl(req);
  process.env.NEXTAUTH_URL = baseUrl;
  
  // Log for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[NextAuth] Dynamic URL:", baseUrl);
  }
  
  return await NextAuth(req, res, createAuthOptions(baseUrl));
}