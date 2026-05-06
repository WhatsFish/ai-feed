import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // basePath must mirror Next.js basePath in next.config.js. Auth.js doesn't
  // pick this up from Next automatically.
  basePath: "/feed/api/auth",
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/feed/login",
  },
  // Any GitHub user is allowed in — no allowlist by design.
  callbacks: {
    async signIn() {
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { login?: string }).login = token.login as string | undefined;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile && "login" in profile) {
        token.login = (profile as { login?: string }).login;
      }
      return token;
    },
  },
  trustHost: true,
});
