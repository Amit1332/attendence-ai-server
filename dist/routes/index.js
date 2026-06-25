"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const attendanceRoutes_1 = __importDefault(require("./attendanceRoutes"));
const aiRoutes_1 = __importDefault(require("./aiRoutes"));
const router = (0, express_1.Router)();
router.use("/auth", authRoutes_1.default);
router.use("/users", userRoutes_1.default);
router.use("/attendance", attendanceRoutes_1.default);
router.use("/ai", aiRoutes_1.default);
exports.default = router;
