const fs = require("node:fs");
const path = require("node:path");
const { register } = require("tsx/cjs/api");

const ensureDir = (relativePath) => {
  fs.mkdirSync(path.join(process.cwd(), relativePath), { recursive: true });
};

ensureDir("public/receipts");
ensureDir("uploads");
ensureDir("uploads/school");
ensureDir("uploads/students");

register();
require("./src/server.ts");
