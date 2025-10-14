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

(async function(){
  try{
    const rows = await db.$queryRawUnsafe('SELECT "passwordHash" FROM "public"."User" WHERE email = $1', 'owner@example.com');
    console.log('raw rows:', rows);
    const hash = rows?.[0]?.passwordHash;
    console.log('hash:', hash);
    console.log('len:', hash?.length);
    console.log('compare:', await bcrypt.compare('password123', hash));
  }catch(e){ console.error(e); }
  finally{ await db.$disconnect(); }
})();
