import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import prisma from "../config/prisma";

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async (socket) => {
    console.log(`Client Connected: ${socket.id}`);
    
    // Emit initial stats on connection
    await emitStats();

    socket.on("disconnect", async () => {
      console.log(`Client Disconnected: ${socket.id}`);
      await emitStats();
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
};

export const emitStats = async () => {
  try {
    if (!io) return;

    const onlineCount = await prisma.user.count({
      where: { isActive: true },
    });

    const offlineCount = await prisma.user.count({
      where: { isActive: false },
    });

    io.emit("stats:update", {
      onlineCount,
      offlineCount,
    });
  } catch (error) {
    console.error("Error emitting socket stats:", error);
  }
};
