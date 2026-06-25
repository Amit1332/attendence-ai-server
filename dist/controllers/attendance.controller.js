"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_codes_1 = require("@simple-node/http-status-codes");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const attendance_service_1 = __importDefault(require("../services/attendance.service"));
const checkIn = (0, catchAsync_1.default)(async (req, res) => {
    const result = await attendance_service_1.default.checkIn(req.user.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Checked in successfully.",
        data: result,
    });
});
const checkOut = (0, catchAsync_1.default)(async (req, res) => {
    const result = await attendance_service_1.default.checkOut(req.user.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Checked out successfully.",
        data: result,
    });
});
const getMyAttendance = (0, catchAsync_1.default)(async (req, res) => {
    const result = await attendance_service_1.default.getOwnAttendance(req.user.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: result,
    });
});
const getAttendanceHistory = (0, catchAsync_1.default)(async (req, res) => {
    const result = await attendance_service_1.default.getAttendanceHistory(req.user.role, req.user.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: result,
    });
});
exports.default = {
    checkIn,
    checkOut,
    getMyAttendance,
    getAttendanceHistory,
};
