import { prepare } from "https://deno.land/x/plugin_prepare/mod.ts";

export * from "./sqlite.ts";

const releaseUrl =
  "https://github.com/crabmusket/deno_sqlite_plugin/releases/download/v0.5";

export const sqlitePlugin = await prepare({
  name: "deno_sqlite_plugin",
  urls: {
    linux: `${releaseUrl}/libdeno_sqlite_plugin.so`,
  },
});
