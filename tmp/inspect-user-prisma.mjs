import pkg from '../src/generated/prisma/client.js';
const { PrismaClient } = pkg;
const db = new PrismaClient();

async function main(){
  const user = await db.user.findUnique({ where: { email: 'owner@example.com' } });
  console.log(JSON.stringify(user, null, 2));
}

main().then(()=>db.$disconnect()).catch(err=>{ console.error(err); db.$disconnect(); process.exit(1); });
