#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Client } = pg;

function loadDotenv(file = '.env'){
  if(!fs.existsSync(file)) return {};
  const obj={};
  const src=fs.readFileSync(file,'utf8');
  for(const line of src.split(/\n/)){
    const t=line.trim(); if(!t||t.startsWith('#')) continue;
    const i=t.indexOf('='); if(i===-1) continue;
    let k=t.slice(0,i).trim(); let v=t.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1);
    obj[k]=v;
  }
  return obj;
}

const env = loadDotenv('.env');
const databaseUrl = env.DATABASE_URL;
if(!databaseUrl){ console.error('DATABASE_URL not found'); process.exit(2); }

const sqlPath = path.resolve(process.cwd(),'prisma-migration.sql');
if(!fs.existsSync(sqlPath)){
  console.error('prisma-migration.sql not found at', sqlPath);
  process.exit(2);
}

const sql = fs.readFileSync(sqlPath,'utf8');

(async ()=>{
  const client = new Client({ connectionString: databaseUrl });
  try{
    await client.connect();
    console.log('Connected to DB. Running migration SQL...');
    // Split statements naively by \n; still better to run whole file in one query
    // Run as single query to preserve transaction context in SQL (the file may include multiple statements)
    await client.query(sql);
    console.log('SQL applied successfully');
  }catch(e){
    console.error('Applying SQL failed:', e.message || e);
    process.exit(3);
  }finally{
    await client.end();
  }
})();
