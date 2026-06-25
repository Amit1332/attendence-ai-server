"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../config/prisma"));
class AuthRepository {
    async findByEmail(email) {
        return prisma_1.default.user.findUnique({
            where: { email },
        });
    }
    async findById(id) {
        return prisma_1.default.user.findUnique({
            where: { id },
        });
    }
    async createUser(data) {
        return prisma_1.default.user.create({
            data,
        });
    }
    async updateUser(id, data) {
        return prisma_1.default.user.update({
            where: { id },
            data,
        });
    }
    async saveRefreshToken(userId, token) {
        return prisma_1.default.refreshToken.create({
            data: {
                token,
                userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
    }
    async deleteRefreshToken(userId) {
        return prisma_1.default.refreshToken.deleteMany({
            where: {
                userId,
            },
        });
    }
    async deleteToken(token) {
        return prisma_1.default.refreshToken.deleteMany({
            where: {
                token,
            },
        });
    }
    async findRefreshToken(token) {
        return prisma_1.default.refreshToken.findFirst({
            where: {
                token,
            },
        });
    }
}
exports.default = new AuthRepository();
