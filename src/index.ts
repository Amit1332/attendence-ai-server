import { Server as HttpServer } from "http";

import app from "./app";
import config from "./config/config";
import { initSocket } from "./utils/socket";
// import dbConnection from "./config/database";
import { SUCCESS_MESSAGES } from "./constants/messages";
import { initializeAISettings } from "./utils/aiSettings";

let server: HttpServer;

const startServer = async (): Promise<void> => {
  try {
    // Load AI Settings from database
    await initializeAISettings();

    // Connect Database
    // await dbConnection();

    // Start Express Server
    server = app.listen(config.port, () => {
      console.log(`${SUCCESS_MESSAGES.SERVER_STARTED} ${config.port}`);
    });

    // Initialize Socket.IO using the utility module
    initSocket(server);
    console.log("✅ Socket.IO initialized");

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

const exitHandler = (): void => {
  if (server) {
    server.close(() => {
      console.log("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error): void => {
  console.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);

process.on("unhandledRejection", (reason: unknown) => {
  throw reason;
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  exitHandler();
});

process.on("SIGINT", () => {
  console.log("SIGINT received");
  exitHandler();
});