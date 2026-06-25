"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../config/prisma"));
const client_1 = require("@prisma/client");
class UserRepository {
    async findById(id) {
        return prisma_1.default.user.findUnique({
            where: { id },
            include: {
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                department: true,
            },
        });
    }
    async findByEmail(email) {
        return prisma_1.default.user.findUnique({
            where: { email },
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
    async deleteUser(id) {
        // Delete related refresh tokens first to prevent foreign key constraint issues
        await prisma_1.default.refreshToken.deleteMany({
            where: { userId: id },
        });
        // Delete attendances
        await prisma_1.default.attendance.deleteMany({
            where: { userId: id },
        });
        // Delete embeddings
        await prisma_1.default.employeeEmbedding.deleteMany({
            where: { userId: id },
        });
        // Delete documents
        await prisma_1.default.document.deleteMany({
            where: { uploadedById: id },
        });
        return prisma_1.default.user.delete({
            where: { id },
        });
    }
    async findAll(where) {
        return prisma_1.default.user.findMany({
            where,
            include: {
                manager: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                department: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
    async findManagers() {
        return prisma_1.default.user.findMany({
            where: {
                role: client_1.Role.MANAGER,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
            },
        });
    }
}
exports.default = new UserRepository();
