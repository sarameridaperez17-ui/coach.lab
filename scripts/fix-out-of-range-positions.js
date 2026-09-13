// One-off: corrige las filas de game_system_positions que se quedaron con
// coordenadas del campo vertical antiguo (0-100) sin convertir al sistema
// de metros horizontal del componente <Pitch> (x: 0-105, y: 0-68).
//
// Solo toca las filas cuyo x/y actual está fuera del rango válido en
// metros (x<0, x>105, y<0 o y>68) — es decir, las que nunca se llegaron
// a arrastrar/guardar tras el cambio a campo horizontal. El resto (ya
// migradas por uso normal) se deja intacto.
//
// Fórmula (misma que scripts/migrate-system-positions-to-meters.js):
//   x_m = (1 - y_pct/100) * 105
//   y_m = (x_pct/100) * 68
//
// Ejecutar UNA sola vez: node scripts/fix-out-of-range-positions.js

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
    const { rows } = await client.query(`
      SELECT p.id, p.player_index, p.label, p.x, p.y, s.name AS system_name
      FROM game_system_positions p
      JOIN game_systems s ON s.id = p.game_system_id
      WHERE p.x < 0 OR p.x > 105 OR p.y < 0 OR p.y > 68
      ORDER BY s.name, p.player_index
    `);
    console.log(`Filas fuera de rango a corregir: ${rows.length}`);
    for (const r of rows) {
      const xm = (1 - r.y / 100) * 105;
      const ym = (r.x / 100) * 68;
      await client.query("UPDATE game_system_positions SET x = $1, y = $2 WHERE id = $3", [xm, ym, r.id]);
      console.log(
        `  ${r.system_name} #${r.player_index} ${r.label}: (${Number(r.x).toFixed(1)}, ${Number(r.y).toFixed(1)}) -> (${xm.toFixed(1)}, ${ym.toFixed(1)})`
      );
    }
    console.log(`Corregidas ${rows.length} filas.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
