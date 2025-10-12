import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';
import NextAuth, { getServerSession, type NextAuthOptions, type Session } from "next-auth";
import type { Adapter } from "next-auth/adapters";

import { env } from "@/env";
import { db } from "@/server/db";
import { Role } from "@/server/db/enums";

// Credentials-only auth (email + password). Email/Google providers removed.
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "database",
  },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, role: user.role };
      },
    }),
    // Removed EmailProvider and GoogleProvider
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export const { GET, POST } = handler;

export const getServerAuthSession = async () => {
  if (process.env.NEXT_PUBLIC_E2E === "true") {
    const session: Session = {
      user: {
        id: "e2e-user",
        role: Role.ADMIN,
        name: "Kasir Uji",
        email: "kasir@example.com",
        image: null,
      },
      expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    return session;
  }

  return getServerSession(authOptions);
};
