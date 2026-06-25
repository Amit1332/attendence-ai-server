"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.errorConverter = void 0;
const http_status_codes_1 = require("@simple-node/http-status-codes");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const config_1 = __importDefault(require("../config/config"));
const errorConverter = (err, req, res, next) => {
    let error = err;
    if (!(error instanceof ApiError_1.default)) {
        const statusCode = error.statusCode ||
            http_status_codes_1.HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
        const message = error.message ||
            http_status_codes_1.HTTP_STATUS_CODES[statusCode];
        error = new ApiError_1.default(statusCode, message, false, error.stack);
    }
    next(error);
};
exports.errorConverter = errorConverter;
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode;
    let message = err.message;
    if (config_1.default.env === "production" &&
        !err.isOperational) {
        statusCode =
            http_status_codes_1.HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;
        message =
            http_status_codes_1.HTTP_STATUS_CODES[http_status_codes_1.HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR];
    }
    res.locals.errorMessage = err.message;
    const response = {
        success: false,
        code: statusCode,
        message,
        ...(config_1.default.env === "development" && {
            stack: err.stack,
        }),
    };
    if (config_1.default.env === "development") {
        console.error(err);
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
