"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../config/prisma"));
class AttendanceRepository {
    async findActiveCheckIn(userId) {
        return prisma_1.default.attendance.findFirst({
            where: {
                userId,
                checkOut: null,
            },
        });
    }
    async createAttendance(data) {
        return prisma_1.default.attendance.create({
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }
    async updateAttendance(id, data) {
        return prisma_1.default.attendance.update({
            where: { id },
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
    }
    async findByUserId(userId) {
        return prisma_1.default.attendance.findMany({
            where: {
                userId,
            },
            orderBy: {
                checkIn: "desc",
            },
        });
    }
    async findAll(where) {
        return prisma_1.default.attendance.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                checkIn: "desc",
            },
        });
    }
}
exports.default = new AttendanceRepository();
