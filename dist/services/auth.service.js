"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const http_status_codes_1 = require("@simple-node/http-status-codes");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const auth_repository_1 = __importDefault(require("../respositories/auth.repository"));
const messages_1 = require("../constants/messages");
const config_1 = __importDefault(require("../config/config"));
const token_1 = require("../utils/token");
const socket_1 = require("../utils/socket");
class AuthService {
    /**
     * Register a new user
     */
    async register(userData) {
        const existingUser = await auth_repository_1.default.findByEmail(userData.email);
        if (existingUser) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, messages_1.ERROR_MESSAGES.EMAIL_ALREADY_TAKEN);
        }
        const hashedPassword = await bcryptjs_1.default.hash(userData.password, 10);
        const user = await auth_repository_1.default.createUser({
            ...userData,
            password: hashedPassword,
        });
        const tokens = await (0, token_1.generateAuthTokens)(user.id);
        await auth_repository_1.default.saveRefreshToken(user.id, tokens.refresh.token);
        const { password, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            tokens,
        };
    }
    /**
     * Login with email and password
     */
    async login(credentials) {
        const user = await auth_repository_1.default.findByEmail(credentials.email);
        if (!user) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.UNAUTHORIZED, messages_1.ERROR_MESSAGES.INCORRECT_CREDENTIALS);
        }
        const isPasswordMatched = await bcryptjs_1.default.compare(credentials.password, user.password);
        if (!isPasswordMatched) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.UNAUTHORIZED, messages_1.ERROR_MESSAGES.INCORRECT_CREDENTIALS);
        }
        await auth_repository_1.default.updateUser(user.id, {
            isActive: true,
        });
        // Update live socket stats
        (0, socket_1.emitStats)().catch(err => console.error("Socket emit stats failed:", err));
        const tokens = await (0, token_1.generateAuthTokens)(user.id);
        await auth_repository_1.default.saveRefreshToken(user.id, tokens.refresh.token);
        const { password, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            tokens,
        };
    }
    /**
     * Get user profile details
     */
    async getProfile(userId) {
        const user = await auth_repository_1.default.findById(userId);
        if (!user) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.NOT_FOUND, "User not found");
        }
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    /**
     * Logout user and invalidate their refresh tokens
     */
    async logout(userId) {
        await auth_repository_1.default.deleteRefreshToken(userId);
        await auth_repository_1.default.updateUser(userId, {
            isActive: false,
        });
        // Update live socket stats
        (0, socket_1.emitStats)().catch(err => console.error("Socket emit stats failed:", err));
        return true;
    }
    /**
     * Refresh authentication tokens using a refresh token
     */
    async refreshToken(token) {
        if (!token) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Refresh token is required");
        }
        const dbToken = await auth_repository_1.default.findRefreshToken(token);
        if (!dbToken) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.UNAUTHORIZED, "Invalid refresh token");
        }
        try {
            jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
            if (dbToken.expiresAt < new Date()) {
                await auth_repository_1.default.deleteToken(token);
                throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.UNAUTHORIZED, "Refresh token expired");
            }
            const tokens = await (0, token_1.generateAuthTokens)(dbToken.userId);
            await auth_repository_1.default.deleteToken(token);
            await auth_repository_1.default.saveRefreshToken(dbToken.userId, tokens.refresh.token);
            return tokens;
        }
        catch (error) {
            await auth_repository_1.default.deleteToken(token);
            if (error instanceof ApiError_1.default) {
                throw error;
            }
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.UNAUTHORIZED, "Invalid or expired refresh token");
        }
    }
}
exports.default = new AuthService();
