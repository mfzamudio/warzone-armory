const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync(0, "utf8");
const scripts = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
const stream = scripts
  .filter((script) => script.includes("data-tsr-stream-part"))
  .map((script) => script.replace(/^<script\b[^>]*>|<\/script>$/gi, ""))
  .join("\n");

if (!stream) {
  throw new Error("Could not find CODMunity SSR stream parts");
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

if (!Array.isArray(context.$R?.tsr) || context.$R.tsr.length === 0) {
  throw new Error("Could not decode CODMunity SSR state");
}

process.stdout.write(JSON.stringify({ weapons: context.$R.tsr }));