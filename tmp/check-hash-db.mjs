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
    const row = await db.$queryRawUnsafe("SELECT passwordHash, length(passwordHash) as len, encode(convert_to(passwordHash,'UTF8'),'hex') as hex FROM \"public\".\"User\" WHERE email = $1", 'owner@example.com');
    console.log(row);
    const hash = row[0]?.passwordhash || row[0]?.passwordHash;
    console.log('hash raw:', JSON.stringify(hash));
    console.log('len property:', row[0]?.len);
    console.log('hex:', row[0]?.hex);
    console.log('bcrypt.compare result (async):', await bcrypt.compare('password123', hash));
    console.log('bcrypt.compareSync result:', bcrypt.compareSync('password123', hash));
  }catch(e){
    console.error(e);
  }finally{
    await db.$disconnect();
  }
})();
