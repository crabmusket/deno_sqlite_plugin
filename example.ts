import { Sqlite } from "./src/mod.ts";

Deno.openPlugin("./target/debug/libdeno_sqlite_plugin.so");

const sqlite = new Sqlite();
const db = await sqlite.connect(":memory:");

await db.execute(`
  CREATE TABLE IF NOT EXISTS podcasts (
    name TEXT,
    subject TEXT
  )
`);

await db.execute(
  `
    INSERT INTO podcasts (name, subject)
    VALUES (?, ?), (?, ?), (?, ?)
  `,
  [
    ["Econtalk", "economics"],
    ["Random Shipping Forecast", "shipping"],
    ["Revolutions", "revolutions"],
  ].flat(),
);

console.log(
  await db.query("SELECT name, subject FROM podcasts", []),
);
