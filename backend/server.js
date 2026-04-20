const app = require("./src/app");
const ensureSchema = require("./src/config/ensureSchema");

const PORT = process.env.PORT || 3000;

async function startServer() {
  await ensureSchema();

  app.listen(PORT, () => {
    console.log(`EnrollSched backend running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start EnrollSched backend:", error);
  process.exit(1);
});
