import { Sqlite } from "../src/mod.ts";
import { assert, assertEquals } from "https://deno.land/std/testing/asserts.ts";
import "./_open_plugin.js";

Deno.test("[e2e] stuart", async function () {
  let sqlite = new Sqlite();

  let connection = await sqlite.connect(":memory:");
  await connection.execute(`CREATE TABLE IF NOT EXISTS person (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    height          REAL NOT NULL,
    time_created    TEXT NOT NULL
  )`);

  let now = new Date().toISOString();
  let rowsAffected = await connection.execute(
    `INSERT INTO person (name, height, time_created) VALUES (?, ?, ?)`,
    ["stuart", 12.4, now],
  );
  assertEquals(1, rowsAffected, "inserted 1 row");

  let result = await connection.query(
    `SELECT * FROM person WHERE name = ?`,
    ["stuart"],
  );
  assertEquals([
    [1, "stuart", 12.4, now],
  ], result);
});

Deno.test("[e2e] byte blob", async function () {
  let sqlite = new Sqlite();

  let connection = await sqlite.connect(":memory:");
  await connection.execute(`CREATE TABLE IF NOT EXISTS blobs (
    id        INTEGER PRIMARY KEY,
    content   BLOB
  )`);

  let bytes = new Uint8Array([0, 1, 2, 3, 4]);
  let rowsAffected = await connection.execute(
    `INSERT INTO blobs (content) VALUES (?)`,
    [bytes.buffer],
  );
  assertEquals(1, rowsAffected, "inserted 1 row");

  let result = await connection.query(`SELECT * FROM blobs`);
  assertEquals(1, result.length, "got 1 result");
  assertEquals(2, result[0].length, "result row has 2 cols");
  assertEquals(1, result[0][0], "row id is 1");
  let resultArray = new Uint8Array(result[0][1]);
  // make sure the result matches the input exactly
  assert(
    resultArray.every((val, i) => {
      return val === bytes[i];
    }),
    "values match input array",
  );
});

Deno.test("[e2e] float32 blob", async function () {
  let sqlite = new Sqlite();

  let connection = await sqlite.connect(":memory:");
  await connection.execute(`CREATE TABLE IF NOT EXISTS blobs (
    id        INTEGER PRIMARY KEY,
    content   BLOB
  )`);

  let floatArray = new Float32Array(5);
  floatArray.fill(42.42);
  let rowsAffected = await connection.execute(
    `INSERT INTO blobs (content) VALUES (?)`,
    [floatArray.buffer],
  );
  assertEquals(1, rowsAffected, "inserted 1 row");

  let result = await connection.query(`SELECT * FROM blobs`);
  assertEquals(1, result.length, "got 1 result");
  assertEquals(2, result[0].length, "result row has 2 cols");
  assertEquals(1, result[0][0], "row id is 1");
  let resultArray = new Float32Array(result[0][1]);
  const epsilon = 0.0001;
  assert(
    resultArray.every(matchFp(42.42, epsilon)),
    `values match to within ${epsilon}`,
  );
});

function matchFp(target, eps = 0.00001) {
  return function (value) {
    return Math.abs(target - value) < eps;
  };
}
