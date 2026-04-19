const mysql = require("mysql2/promise");
require("dotenv").config();

function getSslConfig() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }

  const sslConfig = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };

  if (process.env.DB_SSL_CA) {
    sslConfig.ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
  }

  return sslConfig;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "enrollsched_db",
  port: Number(process.env.DB_PORT) || 3306,
  ssl: getSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
