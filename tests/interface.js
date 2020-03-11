import { init } from "../src/mod.ts";

const filenameBase = "deno_sqlite_plugin";

let filenameSuffix = ".so";
let filenamePrefix = "lib";

if (Deno.build.os === "win") {
  filenameSuffix = ".dll";
  filenamePrefix = "";
}
if (Deno.build.os === "mac") {
  filenameSuffix = ".dylib";
}

const filename = `./target/${Deno.args[0] || "debug"}/${filenamePrefix}${filenameBase}${filenameSuffix}`;

let sqlite = await init(filename);

let connection = await sqlite.connect(":memory:");
await connection.execute(`CREATE TABLE IF NOT EXISTS person (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  height          REAL NOT NULL,
  time_created    TEXT NOT NULL
)`);

let rowsAffected = await connection.execute(`INSERT INTO person (name, height, time_created) VALUES (?, ?, ?)`, ["stuart", 12.4, new Date().toISOString()]);
console.log('inserted person,', rowsAffected, 'rows affected');

console.log(await connection.query(`SELECT * FROM person WHERE name = ?`, ["stuart"]));
