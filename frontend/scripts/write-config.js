const fs = require("fs");
const path = require("path");

const apiBaseUrl =
  process.env.ENROLLSCHED_API_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "";

const configPath = path.join(__dirname, "..", "assets", "js", "config.js");
const configSource = `window.ENROLLSCHED_CONFIG = window.ENROLLSCHED_CONFIG || {
  API_BASE_URL: ${JSON.stringify(apiBaseUrl)}
};
`;

fs.writeFileSync(configPath, configSource);
console.log(`Wrote config.js with API_BASE_URL=${apiBaseUrl || "(same-origin)"}`);
