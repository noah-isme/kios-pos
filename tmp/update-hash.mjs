import fs from 'fs';
import path from 'path';
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
  const hash = bcrypt.hashSync('password123', 10);
  console.log('new hash =', hash);
  await db.$executeRawUnsafe('UPDATE "public"."User" SET "passwordHash" = $1 WHERE email = $2', hash, 'owner@example.com');
  console.log('updated');
}

main().then(()=>db.$disconnect()).catch(err=>{ console.error(err); db.$disconnect(); process.exit(1); });
