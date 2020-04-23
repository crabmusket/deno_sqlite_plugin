# deno sqlite plugin :seedling:

Bindings to [rusqlite](https://github.com/jgallagher/rusqlite) for [deno](https://deno.land).

## Stability

**UNSTABLE** :rotating_light:

This plugin **will panic** if anything goes slightly wrong.
Probably don't use it in production just yet.

**COMPATIBILITY** 🦕

This plugin has been tested against deno v0.40.0

## Usage

First, download the compiled plugin (~10MB).
If you're not using Linux, you will have to compile from source for now (see below).

```bash
wget https://github.com/crabmusket/deno_sqlite_plugin/releases/download/v0.2/libdeno_sqlite_plugin.so
```

Now copy this to `sqlite.ts`:

```ts
import { Sqlite } from "https://raw.githubusercontent.com/crabmusket/deno_sqlite_plugin/v0.2/src/mod.ts";

const sqlite = new Sqlite(Deno.openPlugin("./libdeno_sqlite_plugin.so"));
const db = await sqlite.connect("./db.sqlite3");
await db.execute("CREATE TABLE IF NOT EXISTS names (name TEXT)");
await db.execute("INSERT INTO names (name) VALUES (?)", ["ryan dahl"]);
console.log(
  await db.query("SELECT name FROM names", [])
);
```

And then run the script:

```bash
$ deno --allow-plugin sqlite.ts
[ [ "ryan dahl" ] ]
```

## Auto-download plugin

You can also import `prepared.ts` to fetch the plugin transparently using [plugin_prepare](https://github.com/manyuanrong/deno-plugin-prepare).
Replace the top lines of the example above with:

```ts
import { Sqlite, sqlitePlugin } from "https://raw.githubusercontent.com/crabmusket/deno_sqlite_plugin/v0.2/src/prepared.ts";

const sqlite = new Sqlite(sqlitePlugin);
```

This may be more ergonomic if you want to use Sqlite in a library that others will depend on.

## Build from source

Install Rust (I recommend [rustup](https://rustup.rs/)) and [deno](https://deno.land/#install) and build with Cargo:

```bash
cargo build --release
```

This will take some time (30-40 minutes on a laptop) because it compiles all of V8.
A release build will use a few hundred MB of disk space, and a debug build may use up to 2GB.

## When would I use this?

Use this plugin whenever you would embed an SQLite database into any other program.
It's essentially just a JavaScript wrapper around a Rust wrapper around the actual SQLite C code.

[deno-sqlite](https://github.com/dyedgreen/deno-sqlite), which is awesome, works in browsers; this plugin _does not_.
This plugin _does_ allow you to work with SQLite databases from the filesystem with all the durability and performance SQLite provides.
Wasm-based SQLite ports require you to load the entire database file into memory, operate on it, then save the whole thing back to disk again.

SQLite is [_very good_](https://sqlite.org/testing.html).
You might not always need a remote database like MySQL or Postgres.
But if you do, check out [deno_mysql](https://github.com/manyuanrong/deno_mysql) or [deno-postgres](https://github.com/buildondata/deno-postgres).

## How does it work?

Query parameters are encoded to JSON text and sent from deno's JS runtime to the plugin.
The plugin decodes the JSON then performs the query against SQLite using rusqlite.
It then re-encodes the result as JSON and sends it back to JS-land.

SQLite's [BLOB type](https://www.sqlite.org/datatype3.html) is encoded using base64 for transmission via JSON and exposed in the deno interface as an [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).
(It might be nice to use a binary serialisation format like CBOR instead of JSON to avoid the base64 encode/decode on either side.)

## TODO

- [ ] Please don't look at any of my code, it's awful
- [x] Make JS-side interface slightly nicer? Remove `init`
- [ ] Remove all uses of `unwrap()` in Rust; pass errors to JS gracefully
- [ ] Test performance of JSON serialisation for ops and investigate CBOR
- [ ] Implement more [connection methods](https://docs.rs/rusqlite/0.21.0/rusqlite/struct.Connection.html)?
- [ ] What are the implications of using `thread_local!` for `CONNECTION_MAP`?
- [ ] [Embed version](https://stackoverflow.com/a/27841363)
- [ ] Tests 😬

## Licenses

* SQLite is [public domain](https://sqlite.org/copyright.html)
* rusqlite is [MIT](https://github.com/jgallagher/rusqlite/blob/master/LICENSE)
* [Buffer to base64](./src/bufferToBase64.js) implementation is [MIT](https://gist.githubusercontent.com/jonleighton/958841/raw/fb05a8632efb75d85d43deb593df04367ce48371/base64ArrayBuffer.js)
* This package's code is [MIT](./LICENSE)
