import http from "node:http";
import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import env from "./config/env.js";
import { ensureRuntimeAdminUser } from "./services/auth.service.js";
import { initializeSocket } from "./sockets/socketServer.js";

async function bootstrap() {
  await connectDatabase();
  await ensureRuntimeAdminUser();

  const server = http.createServer(app);
  initializeSocket(server);

  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });

  const gracefulShutdown = async () => {
    await disconnectDatabase();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
