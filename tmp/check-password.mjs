import fs from 'fs';
import path from 'path';

// minimal .env loader
function loadDotEnv(file){
  if(!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file,'utf8').split(/\r?\n/);
  for(const line of lines){
    const trimmed = line.trim();
    if(!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if(eq === -1) continue;
    let k = trimmed.slice(0,eq).trim();
    let v = trimmed.slice(eq+1).trim();
    if(v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1);
    if(v.startsWith("'") && v.endsWith("'")) v = v.slice(1,-1);
    process.env[k]=v;
  }
}

loadDotEnv(path.resolve(process.cwd(),'.env'));

import pkg from '../src/generated/prisma/client.js';
const { PrismaClient } = pkg;
const db = new PrismaClient();
import bcrypt from 'bcryptjs';

async function main(){
  const email = process.argv[2] ?? 'owner@example.com';
  const password = process.argv[3] ?? 'password123';
  const user = await db.user.findUnique({ where: { email }, select: { id:true, email:true, passwordHash:true, role:true } });
  console.log('User record:');
  console.log(JSON.stringify(user, null, 2));
  if(!user) {
    console.error('User not found');
    process.exit(2);
  }
  if(!user.passwordHash) {
    console.error('No passwordHash set for user');
    process.exit(3);
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log('bcrypt.compare result:', ok);
}

main().then(()=>db.$disconnect()).catch(err=>{ console.error(err); db.$disconnect(); process.exit(1); });
