import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { xssClean } from "./middlewares/xss";
import cors from "cors";

import baseRoutes from "./routes";
import { authLimiter } from "./middlewares/rateLimiter";
import { errorConverter, errorHandler } from "./middlewares/error";
import config from "./config/config";
import morgan from "./utils/morgan";
import ApiError from "./utils/ApiError";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";

const app = express();

if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// Enable CORS
app.use(cors());
app.options(/.*/, cors());

// Parse JSON
app.use(express.json({ limit: "10kb" }));

// Security Headers
app.use(
  helmet({
    dnsPrefetchControl: false,
    frameguard: false,
    ieNoOpen: false,
  })
);


// Prevent XSS
app.use(xssClean);

// Rate Limiting
if (config.env === "production") {
  app.use("/api/v1/auth", authLimiter);
}

// Routes
app.use("/api/v1", baseRoutes);

// Health Check
app.get("/ping", (req: Request, res: Response) => {
  return res.json({});
});

// 404 Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(HTTP_STATUS_CODES.NOT_FOUND, "Not found"));
});

// Convert Error
app.use(errorConverter);

// Global Error Handler
app.use(errorHandler);

export default app;