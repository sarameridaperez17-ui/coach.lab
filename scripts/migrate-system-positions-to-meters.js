// One-off: convierte game_system_positions del campo vertical 0-100
// (y=0 ataque arriba, y=100 portería propia abajo) al sistema de
// coordenadas maestro en metros del componente <Pitch> (horizontal,
// x=0 portería propia izda -> x=105 portería rival dcha, y=0..68).
//
//   x_m = (1 - y_pct/100) * 105
//   y_m = (x_pct/100) * 68
//
// Ejecutar UNA sola vez:  node scripts/migrate-system-positions-to-meters.js

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const content = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  loadEnvLocal();
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT id, x, y FROM game_system_positions");
    console.log(`Filas a convertir: ${rows.length}`);
    let done = 0;
    for (const r of rows) {
      const xm = (1 - r.y / 100) * 105;
      const ym = (r.x / 100) * 68;
      await client.query("UPDATE game_system_positions SET x = $1, y = $2 WHERE id = $3", [xm, ym, r.id]);
      done++;
    }
    console.log(`Convertidas ${done} filas a metros.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
