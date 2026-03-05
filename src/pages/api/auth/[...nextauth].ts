import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextApiRequest, NextApiResponse } from "next";

// Helper to get the base URL from request headers
function getBaseUrl(req: NextApiRequest): string {
  // Check for forwarded headers (used by proxies like Vercel, Cloudflare, etc.)
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  
  // Use forwarded values if available, otherwise fall back to request headers
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || "https";
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || req.headers.host;
  
  return `${protocol}://${host}`;
}

// Create auth options dynamically based on request
function createAuthOptions(req: NextApiRequest): NextAuthOptions {
  const baseUrl = getBaseUrl(req);
  
  return {
    providers: [
      GoogleProvider({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            access_type: "offline",
            prompt: "consent",
            scope: [
              "openid",
              "email",
              "profile",
              "https://www.googleapis.com/auth/drive.file",
              "https://www.googleapis.com/auth/spreadsheets",
              "https://www.googleapis.com/auth/calendar.events",
            ].join(" "),
          },
        },
      }),
    ],
    
    callbacks: {
      async redirect({ url, baseUrl: _defaultBaseUrl }) {
        // Use dynamically detected baseUrl for redirects
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Allow redirects to the same origin
        try {
          const urlOrigin = new URL(url).origin;
          if (urlOrigin === baseUrl) return url;
        } catch {
          // Invalid URL, redirect to base
        }
        return baseUrl;
      },
      
      async jwt({ token, account, user }) {
        if (account && user) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
          token.id = user.id;
        }

        // Return token if not expired
        if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
          return token;
        }

        // Refresh the token if expired
        return refreshAccessToken(token);
      },
      
      async session({ session, token }) {
        session.accessToken = token.accessToken as string;
        session.error = token.error as string | undefined;
        if (session.user) {
          session.user.id = token.id as string;
        }
        return session;
      },
    },

    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    pages: {
      signIn: "/",
      error: "/",
    },

    secret: process.env.NEXTAUTH_SECRET || "sellmore-pos-default-secret-key",
    
    debug: process.env.NODE_ENV === "development",
  };
}

async function refreshAccessToken(token: any) {
  try {
    const url = "https://oauth2.googleapis.com/token";
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // Dynamically set NEXTAUTH_URL based on the incoming request
  // This allows the app to work on any domain without manual configuration
  const baseUrl = getBaseUrl(req);
  process.env.NEXTAUTH_URL = baseUrl;
  
  return await NextAuth(req, res, createAuthOptions(req));
}

// Export for use in other parts of the app if needed
export { createAuthOptions, getBaseUrl };