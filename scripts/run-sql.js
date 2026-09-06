const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

async function main() {
  loadEnvLocal();
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/run-sql.js <archivo.sql>');
    process.exit(1);
  }
  const sql = fs.readFileSync(file, 'utf-8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(sql);
    const results = Array.isArray(res) ? res : [res];
    for (const r of results) {
      if (r.rows && r.rows.length) console.log(r.rows);
    }
    console.log(`OK: ${file}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
