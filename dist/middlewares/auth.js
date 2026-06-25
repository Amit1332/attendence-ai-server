"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const config_1 = __importDefault(require("../config/config"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const isAuthenticatedUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new ApiError_1.default(401, "Authentication token is missing."));
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        const user = await prisma_1.default.user.findUnique({
            where: {
                id: decoded.sub,
            },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
            },
        });
        if (!user) {
            return next(new ApiError_1.default(401, "User not found."));
        }
        if (!user.isActive) {
            return next(new ApiError_1.default(403, "User account is inactive."));
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        next(new ApiError_1.default(401, "Invalid or expired access token."));
    }
};
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new ApiError_1.default(403, "You do not have permission to perform this action."));
        }
        next();
    };
};
exports.default = {
    isAuthenticatedUser,
    authorizeRoles,
};
