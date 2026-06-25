"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuthTokens = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config/config"));
/**
 * Generate a JWT token
 */
const generateToken = (userId, expiresInMinutesOrDays, isRefresh = false) => {
    const payload = {
        sub: userId,
    };
    const secret = config_1.default.jwt.secret;
    const expiresIn = isRefresh
        ? `${config_1.default.jwt.refreshExpirationDays}d`
        : `${config_1.default.jwt.accessExpirationMinutes}m`;
    const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
    const ms = isRefresh
        ? config_1.default.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000
        : config_1.default.jwt.accessExpirationMinutes * 60 * 1000;
    return {
        token,
        expires: new Date(Date.now() + ms),
    };
};
exports.generateToken = generateToken;
/**
 * Generate access and refresh tokens for a user
 */
const generateAuthTokens = async (userId) => {
    const accessToken = (0, exports.generateToken)(userId, config_1.default.jwt.accessExpirationMinutes, false);
    const refreshToken = (0, exports.generateToken)(userId, config_1.default.jwt.refreshExpirationDays, true);
    return {
        access: accessToken,
        refresh: refreshToken,
    };
};
exports.generateAuthTokens = generateAuthTokens;
