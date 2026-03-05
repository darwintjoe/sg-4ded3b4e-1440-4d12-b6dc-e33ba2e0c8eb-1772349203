import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextApiRequest, NextApiResponse } from "next";

export function getAuthOptions(req: NextApiRequest): NextAuthOptions {
  // Auto-detect the base URL from the request
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

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
      async redirect({ url, baseUrl: callbackBaseUrl }) {
        // Use the detected baseUrl for redirects
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        else if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      },
      
      async jwt({ token, account, user }) {
        if (account && user) {
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
          token.id = user.id;
        }

        if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
          return token;
        }

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
      maxAge: 30 * 24 * 60 * 60,
    },

    pages: {
      signIn: "/",
      error: "/",
    },

    secret: process.env.NEXTAUTH_SECRET,
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
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  return await NextAuth(req, res, getAuthOptions(req));
}