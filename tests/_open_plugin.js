const base = "deno_sqlite_plugin";

let suffix = ".so";
let prefix = "lib";

if (Deno.build.os === "win") {
  suffix = ".dll";
  prefix = "";
}
if (Deno.build.os === "mac") {
  suffix = ".dylib";
}

const target = Deno.args[0] || "debug";
const filename = `./target/${target}/${prefix}${base}${suffix}`;

Deno.openPlugin(filename);
