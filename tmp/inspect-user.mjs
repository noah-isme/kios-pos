import { db } from '../src/server/db';

async function main(){
  const user = await db.user.findUnique({ where: { email: 'owner@example.com' } });
  console.log(JSON.stringify(user, null, 2));
}

main().then(()=>db.$disconnect()).catch(err=>{ console.error(err); db.$disconnect(); process.exit(1); });
