"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitStats = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const prisma_1 = __importDefault(require("../config/prisma"));
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", async (socket) => {
        console.log(`Client Connected: ${socket.id}`);
        // Emit initial stats on connection
        await (0, exports.emitStats)();
        socket.on("disconnect", async () => {
            console.log(`Client Disconnected: ${socket.id}`);
            await (0, exports.emitStats)();
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized!");
    }
    return io;
};
exports.getIO = getIO;
const emitStats = async () => {
    try {
        if (!io)
            return;
        const onlineCount = await prisma_1.default.user.count({
            where: { isActive: true },
        });
        const offlineCount = await prisma_1.default.user.count({
            where: { isActive: false },
        });
        io.emit("stats:update", {
            onlineCount,
            offlineCount,
        });
    }
    catch (error) {
        console.error("Error emitting socket stats:", error);
    }
};
exports.emitStats = emitStats;
