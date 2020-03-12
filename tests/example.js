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

const filename = `./target/${Deno.args
  [0]}/${filenamePrefix}${filenameBase}${filenameSuffix}`;

const plugin = Deno.openPlugin(filename);

let response = plugin.ops.openConnection.dispatch(
  new TextEncoder().encode(JSON.stringify({
    path: ":memory:"
  }))
);
let connId =
  JSON.parse(new TextDecoder().decode(response)).result.connection_id;

const createPersonTable = `CREATE TABLE IF NOT EXISTS person (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  time_created    TEXT NOT NULL
)`;

response = plugin.ops.execute.dispatch(
  new TextEncoder().encode(JSON.stringify({
    connection_id: connId,
    statement: createPersonTable,
    params: []
  }))
);
console.log(`execute response: ${new TextDecoder().decode(response)}`);

const insertPerson = `INSERT INTO person (name, time_created) VALUES (?, ?)`;

response = plugin.ops.execute.dispatch(
  new TextEncoder().encode(JSON.stringify({
    connection_id: connId,
    statement: insertPerson,
    params: ["stuart", new Date().toISOString()]
  }))
);
console.log(`execute response: ${new TextDecoder().decode(response)}`);

const queryPeopleByName = `SELECT * FROM person WHERE name = ?`;

response = plugin.ops.query.dispatch(new TextEncoder().encode(JSON.stringify({
  connection_id: connId,
  statement: queryPeopleByName,
  params: ["stuart"]
})));
console.log(`query response: ${new TextDecoder().decode(response)}`);

/*
const { testSync, testAsync } = plugin.ops;

const textDecoder = new TextDecoder();

function runTestSync() {
  const response = testSync.dispatch(
    new Uint8Array([116, 101, 115, 116]),
    new Uint8Array([116, 101, 115, 116])
  );

  console.log(`Plugin Sync Response: ${textDecoder.decode(response)}`);
}

testAsync.setAsyncHandler(response => {
  console.log(`Plugin Async Response: ${textDecoder.decode(response)}`);
});

function runTestAsync() {
  const response = testAsync.dispatch(
    new Uint8Array([116, 101, 115, 116]),
    new Uint8Array([116, 101, 115, 116])
  );

  if (response != null || response != undefined) {
    throw new Error("Expected null response!");
  }
}

function runTestOpCount() {
  const start = Deno.metrics();

  testSync.dispatch(new Uint8Array([116, 101, 115, 116]));

  const end = Deno.metrics();

  if (end.opsCompleted - start.opsCompleted !== 2) {
    // one op for the plugin and one for Deno.metrics
    throw new Error("The opsCompleted metric is not correct!");
  }
  if (end.opsDispatched - start.opsDispatched !== 2) {
    // one op for the plugin and one for Deno.metrics
    throw new Error("The opsDispatched metric is not correct!");
  }
}

runTestSync();
runTestAsync();

runTestOpCount();
*/
