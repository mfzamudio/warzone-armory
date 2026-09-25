const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync(0, "utf8");
const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
const stream = scripts
  .map((script) => script.replace(/^<script\b[^>]*>|<\/script>$/gi, ""))
  .find((script) => script.includes("self.$R"));

if (!stream) {
  throw new Error("Could not find CODMunity SSR stream");
}

const context = {
  AbortController,
  ReadableStream,
  TextDecoder,
  TextEncoder,
  document: { currentScript: { remove() {} } },
};
context.self = context;
vm.createContext(context);
vm.runInContext(stream, context, { timeout: 15000 });

const seen = new WeakSet();
let payload;

function findPayload(value, depth = 0) {
  if (payload || depth > 12 || value === null || typeof value !== "object") {
    return;
  }
  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (
    Array.isArray(value.weapons) &&
    value.weapons.length > 10 &&
    Array.isArray(value.metaLoadouts) &&
    Array.isArray(value.weaponStats)
  ) {
    payload = value;
    return;
  }

  for (const child of Object.values(value)) {
    findPayload(child, depth + 1);
    if (payload) {
      return;
    }
  }
}

findPayload(context.$R?.tsr);
if (!payload) {
  throw new Error("Could not find CODMunity weapon payload in SSR stream");
}

process.stdout.write(JSON.stringify(payload));