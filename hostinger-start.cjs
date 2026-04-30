const fs = require("node:fs");
const path = require("node:path");
const { register } = require("tsx/cjs/api");

const ensureDir = (relativePath) => {
  fs.mkdirSync(path.join(process.cwd(), relativePath), { recursive: true });
};

const log = (...args) => {
  console.log("[hostinger-start]", ...args);
};

process.on("uncaughtException", (error) => {
  console.error("[hostinger-start] uncaughtException:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[hostinger-start] unhandledRejection:", reason);
  process.exit(1);
});

try {
  log("Bootstrapping backend");
  log("Node version:", process.version);
  log("Working directory:", process.cwd());
  log("PORT value:", process.env.PORT || "(not provided)");

  ensureDir("public/receipts");
  ensureDir("uploads");
  ensureDir("uploads/school");
  ensureDir("uploads/students");
  log("Required directories ensured");

  const serverEntry = path.join(process.cwd(), "src", "server.ts");
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Server entry not found: ${serverEntry}`);
  }

  register();
  log("tsx register loaded");

  require("./src/server.ts");
  log("src/server.ts loaded");
} catch (error) {
  console.error("[hostinger-start] bootstrap failed:", error);
  process.exit(1);
}
