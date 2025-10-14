#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found. Run seed-initial first.');
    process.exit(1);
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  console.log('✅ Created session for user:', user.email);
  console.log('sessionToken:', sessionToken);
  console.log('Set this cookie in your browser for domain localhost:');
  console.log(`Name: next-auth.session-token`);
  console.log(`Value: ${sessionToken}`);
  console.log('Path: /');
  console.log('Example curl to call protected endpoint with cookie:');
  console.log(`curl -v --cookie "next-auth.session-token=${sessionToken}" "http://localhost:3000/api/trpc/products.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22search%22%3A%22%22%7D%7D%7D"`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
