# deno_sqlite_plugin

Bindings to [rusqlite](https://github.com/jgallagher/rusqlite) for [deno](https://deno.land).

## Stability

**UNSTABLE** :rotating_light:

This plugin **will panic** if anything goes slightly wrong.
Probably don't use it in production just yet.

## Usage

Install Rust (I recommend [rustup](https://rustup.rs/)) and [deno](https://deno.land/#install).

Build and run:

```bash
cargo build --release
deno --allow-plugin --allow-read=. tests/interface.js release
```

See [interface.js](./tests/interface.js) for the full example.

## When would I use this?

Use this plugin whenever you would embed an SQLite database into any other program.
It's essentially just a wrapper around (another wrapper around) the actual SQLite C code.

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

## Licenses

* SQLite is [public domain](https://sqlite.org/copyright.html)
* rusqlite is [MIT](https://github.com/jgallagher/rusqlite/blob/master/LICENSE)
* [Buffer to base64](./src/bufferToBase64.js) implementation is [MIT](https://gist.githubusercontent.com/jonleighton/958841/raw/fb05a8632efb75d85d43deb593df04367ce48371/base64ArrayBuffer.js)
* This package's code is [MIT](./LICENSE)
