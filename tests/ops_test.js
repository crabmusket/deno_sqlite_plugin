import { assert } from "https://deno.land/std/testing/asserts.ts";
import "./_open_plugin.js";

Deno.test("[ops] expected ops exist", function () {
  const ops = Deno.core.ops();
  assert("tag:crabmusket.github.io,2020:sqliteOpenConnection" in ops);
  assert("tag:crabmusket.github.io,2020:sqliteExecute" in ops);
  assert("tag:crabmusket.github.io,2020:sqliteQuery" in ops);
});
