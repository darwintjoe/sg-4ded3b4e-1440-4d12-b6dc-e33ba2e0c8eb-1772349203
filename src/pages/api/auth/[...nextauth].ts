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

export const authOptions: NextAuthOptions = {
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
    maxAge: 30 * 24 * 60 * 60, // 30 days - "stay logged in"
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist OAuth tokens on initial sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.scope = account.scope;
      }
      
      // Return previous token if the access token has not expired yet
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }
      
      // Access token has expired, try to refresh it
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
            // Keep the refresh token if a new one wasn't provided
            refreshToken: tokens.refresh_token ?? token.refreshToken,
          };
        } catch (error) {
          console.error("Error refreshing access token:", error);
          // Return token with error flag - session will be invalidated
          return { ...token, error: "RefreshAccessTokenError" };
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Make tokens available to the client
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

export default NextAuth(authOptions);