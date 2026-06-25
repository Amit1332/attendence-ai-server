"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const xss_1 = require("./middlewares/xss");
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const rateLimiter_1 = require("./middlewares/rateLimiter");
const error_1 = require("./middlewares/error");
const config_1 = __importDefault(require("./config/config"));
const morgan_1 = __importDefault(require("./utils/morgan"));
const ApiError_1 = __importDefault(require("./utils/ApiError"));
const http_status_codes_1 = require("@simple-node/http-status-codes");
const app = (0, express_1.default)();
if (config_1.default.env !== "test") {
    app.use(morgan_1.default.successHandler);
    app.use(morgan_1.default.errorHandler);
}
// Enable CORS
app.use((0, cors_1.default)());
app.options(/.*/, (0, cors_1.default)());
// Parse JSON
app.use(express_1.default.json({ limit: "10kb" }));
// Security Headers
app.use((0, helmet_1.default)({
    dnsPrefetchControl: false,
    frameguard: false,
    ieNoOpen: false,
}));
// Prevent XSS
app.use(xss_1.xssClean);
// Rate Limiting
if (config_1.default.env === "production") {
    app.use("/api/v1/auth", rateLimiter_1.authLimiter);
}
// Routes
app.use("/api/v1", routes_1.default);
// Health Check
app.get("/ping", (req, res) => {
    return res.json({});
});
// 404 Handler
app.use((req, res, next) => {
    next(new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.NOT_FOUND, "Not found"));
});
// Convert Error
app.use(error_1.errorConverter);
// Global Error Handler
app.use(error_1.errorHandler);
exports.default = app;
