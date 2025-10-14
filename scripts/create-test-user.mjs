import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main(){
  const email = process.argv[2] ?? 'owner@example.com';
  const password = process.argv[3] ?? 'password123';
  const hash = bcrypt.hashSync(password, 10);
  console.log('hash=', hash);
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash: hash, name: 'Owner Test' },
    create: { email, passwordHash: hash, name: 'Owner Test', role: 'OWNER' },
  });
  console.log('user created/updated', user.email);
}

main().catch((e)=>{ console.error(e); process.exit(1); }).finally(()=> process.exit(0));
