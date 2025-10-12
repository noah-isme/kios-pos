#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const email = process.argv[2] || 'owner@example.com';
const expiresInMinutes = 60;

async function main() {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // insert into VerificationToken table
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  const url = `http://localhost:3000/api/auth/callback/email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  console.log('✅ Created verification token for', email);
  console.log('Magic link (valid for', expiresInMinutes, 'minutes):');
  console.log(url);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
