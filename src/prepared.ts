import { prepare } from "https://deno.land/x/plugin_prepare/mod.ts";

export * from "./mod.ts";

const releaseUrl =
  "https://github.com/crabmusket/deno_sqlite_plugin/releases/download/v0.2";

export const sqlitePlugin = await prepare({
  name: "deno_sqlite_plugin",
  urls: {
    linux: `${releaseUrl}/libdeno_sqlite_plugin.so`,
  },
});
