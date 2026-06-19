import app from "./app";
import { logger } from "./lib/logger";
import { seedCatalog } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Converge the platform catalog on startup. Idempotent (upsert by slug) and
// strictly NON-FATAL. Production runs a separate database from the workspace
// and there is no deploy-time seed step, so a freshly deployed environment can
// otherwise sit on a stale catalog (missing newly-added platforms such as Meta
// Business Suite). Seeding here self-heals it on every boot; a failure must
// never stop the server from coming up.
async function bootstrap() {
  try {
    const { upserted, removed } = await seedCatalog();
    logger.info({ upserted, removed }, "Platform catalog seeded");
  } catch (err) {
    logger.error({ err }, "Platform catalog seed failed (continuing to serve)");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

bootstrap();
