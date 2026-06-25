"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config/config"));
const socket_1 = require("./utils/socket");
// import dbConnection from "./config/database";
const messages_1 = require("./constants/messages");
const aiSettings_1 = require("./utils/aiSettings");
let server;
const startServer = async () => {
    try {
        // Load AI Settings from database
        await (0, aiSettings_1.initializeAISettings)();
        // Connect Database
        // await dbConnection();
        // Start Express Server
        server = app_1.default.listen(config_1.default.port, () => {
            console.log(`${messages_1.SUCCESS_MESSAGES.SERVER_STARTED} ${config_1.default.port}`);
        });
        // Initialize Socket.IO using the utility module
        (0, socket_1.initSocket)(server);
        console.log("✅ Socket.IO initialized");
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
const exitHandler = () => {
    if (server) {
        server.close(() => {
            console.log("Server closed");
            process.exit(1);
        });
    }
    else {
        process.exit(1);
    }
};
const unexpectedErrorHandler = (error) => {
    console.error(error);
    exitHandler();
};
process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", (reason) => {
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
