import { Sqlite } from "../src/mod.ts";

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

const filename = `./target/${Deno.args[0] ||
  "debug"}/${filenamePrefix}${filenameBase}${filenameSuffix}`;

let sqlite = new Sqlite(Deno.openPlugin(filename));

let connection = await sqlite.connect(":memory:");
await connection.execute(`CREATE TABLE IF NOT EXISTS binaries (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  data            BLOB
)`);

let blob = new Uint32Array(6).fill(8);
console.log("blob before inserting", blob)
let rowsAffected = await connection.execute(
  `INSERT INTO binaries (name, data) VALUES (?, ?)`,
  ["winrar.exe", blob.buffer]
);
console.log("inserted binary,", rowsAffected, "rows affected");

let result = await connection.query(`SELECT * FROM binaries`, []);
console.log("raw result", result);
console.log("blob as Uint32Array", new Uint32Array(result[0][2]));
