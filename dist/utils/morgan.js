"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const morgan_1 = __importDefault(require("morgan"));
const config_1 = __importDefault(require("../config/config"));
// Custom Morgan Token
morgan_1.default.token("message", (req, res) => {
    return res.locals.errorMessage || "";
});
const getIpFormat = () => {
    return config_1.default.env === "production" ? ":remote-addr - " : "";
};
const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms`;
const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;
const successHandler = (0, morgan_1.default)(successResponseFormat, {
    skip: (_req, res) => res.statusCode >= 400,
    stream: {
        write: (message) => {
            console.log(message.trim());
        },
    },
});
const errorHandler = (0, morgan_1.default)(errorResponseFormat, {
    skip: (_req, res) => res.statusCode < 400,
    stream: {
        write: (message) => {
            console.log(message.trim());
        },
    },
});
exports.default = {
    successHandler,
    errorHandler,
};
