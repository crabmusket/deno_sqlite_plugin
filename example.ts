import { Sqlite } from "./sqlite.ts";

Deno.openPlugin("./target/debug/libdeno_sqlite_plugin.so");

const sqlite = new Sqlite();
const db = await sqlite.connect(":memory:");

await db.execute(`
  CREATE TABLE IF NOT EXISTS podcasts (
    name TEXT,
    subject TEXT
  )
`);

const rowsInserted = await db.execute(
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
console.log(`inserted ${rowsInserted} rows`);

const results = await db.query(
  "SELECT name, subject FROM podcasts WHERE subject = ?",
  ["shipping"],
);
console.log(results);
