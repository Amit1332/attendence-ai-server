"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_codes_1 = require("@simple-node/http-status-codes");
const client_1 = require("@prisma/client");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const attendance_repository_1 = __importDefault(require("../respositories/attendance.repository"));
const socket_1 = require("../utils/socket");
class AttendanceService {
    async checkIn(userId) {
        const activeCheckIn = await attendance_repository_1.default.findActiveCheckIn(userId);
        if (activeCheckIn) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "You are already checked in. Please check out before checking in again.");
        }
        const attendance = await attendance_repository_1.default.createAttendance({
            userId,
            checkIn: new Date(),
        });
        // Notify dashboard in real-time
        try {
            const io = (0, socket_1.getIO)();
            io.emit("attendance:checkin", attendance);
        }
        catch (e) {
            console.warn("Socket.io not active, skipped check-in broadcast");
        }
        return attendance;
    }
    async checkOut(userId) {
        const activeCheckIn = await attendance_repository_1.default.findActiveCheckIn(userId);
        if (!activeCheckIn) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "No active check-in record found. Please check in first.");
        }
        const checkOutTime = new Date();
        const checkInTime = new Date(activeCheckIn.checkIn);
        // Calculate working hours
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        // Calculate overtime (standard shift is 8 hours)
        const overtimeHours = workingHours > 8 ? parseFloat((workingHours - 8).toFixed(2)) : 0;
        const attendance = await attendance_repository_1.default.updateAttendance(activeCheckIn.id, {
            checkOut: checkOutTime,
            workingHours,
            overtimeHours,
        });
        // Notify dashboard in real-time
        try {
            const io = (0, socket_1.getIO)();
            io.emit("attendance:checkout", attendance);
        }
        catch (e) {
            console.warn("Socket.io not active, skipped check-out broadcast");
        }
        return attendance;
    }
    async getOwnAttendance(userId) {
        return attendance_repository_1.default.findByUserId(userId);
    }
    async getAttendanceHistory(creatorRole, creatorId) {
        if (creatorRole === client_1.Role.ADMIN) {
            return attendance_repository_1.default.findAll({});
        }
        else if (creatorRole === client_1.Role.MANAGER) {
            return attendance_repository_1.default.findAll({
                user: {
                    managerId: creatorId,
                },
            });
        }
        else {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.FORBIDDEN, "Access denied. You do not have permission to view general attendance history.");
        }
    }
}
exports.default = new AttendanceService();
