"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = __importDefault(require("../../controllers/attendance.controller"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.default.isAuthenticatedUser);
router.post("/check-in", attendance_controller_1.default.checkIn);
router.post("/check-out", attendance_controller_1.default.checkOut);
router.get("/my-history", attendance_controller_1.default.getMyAttendance);
router.get("/history", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), attendance_controller_1.default.getAttendanceHistory);
exports.default = router;
