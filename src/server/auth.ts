import { PrismaAdapter } from "@auth/prisma-adapter";
import nodemailer from "nodemailer";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";

import { env } from "@/env";
import { db } from "@/server/db";

const emailTransport = env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD
  ? nodemailer.createTransport({
      host: env.EMAIL_SERVER_HOST,
      port: env.EMAIL_SERVER_PORT,
      secure: env.EMAIL_SERVER_PORT === 465,
      auth: {
        user: env.EMAIL_SERVER_USER,
        pass: env.EMAIL_SERVER_PASSWORD,
      },
    })
  : nodemailer.createTransport({
      jsonTransport: true,
    });

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "database",
  },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    EmailProvider({
      from: env.EMAIL_FROM ?? "no-reply@localhost",
      sendVerificationRequest: async ({ identifier, url }) => {
        await emailTransport.sendMail({
          to: identifier,
          from: env.EMAIL_FROM ?? "no-reply@localhost",
          subject: "Masuk ke Kios POS",
          text: `Klik tautan berikut untuk masuk: ${url}`,
          html: `<p>Klik tautan berikut untuk masuk:</p><p><a href="${url}">${url}</a></p>`,
        });

        if (emailTransport.options.jsonTransport) {
          console.info(`[auth] Magic link untuk ${identifier}: ${url}`);
        }
      },
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    }),
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

export const getServerAuthSession = () => getServerSession(authOptions);
