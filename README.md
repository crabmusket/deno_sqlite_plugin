# deno_sqlite_plugin

Bindings to [rusqlite](https://github.com/jgallagher/rusqlite) for [deno](https://deno.land).

## Stability

**UNSTABLE**

This plugin will panic if anything goes slightly wrong.
Probably don't use it in production just yet.

## Usage

See [interface.js](./tests/interface.js).

## How does it work?

Query parameters are encoded to JSON text and sent from deno's JS runtime to the plugin.
The plugin decodes the JSON then performs the query against SQLite using rusqlite.
It then re-encodes the result as JSON and sends it back to JS-land.

SQLite's [BLOB type](https://www.sqlite.org/datatype3.html) is encoded using base64 for transmission via JSON and exposed in the deno interface as an [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).
(It might be nice to use a binary serialisation format like CBOR instead of JSON to avoid the base64 encode/decode on either side.)

## License

SQLite is [public domain](https://sqlite.org/copyright.html).

rusqlite is [MIT](https://github.com/jgallagher/rusqlite/blob/master/LICENSE).

[Buffer to base64](./src/bufferToBase64.js) implementation is [MIT](https://gist.githubusercontent.com/jonleighton/958841/raw/fb05a8632efb75d85d43deb593df04367ce48371/base64ArrayBuffer.js).

This package is [MIT](./LICENSE).
