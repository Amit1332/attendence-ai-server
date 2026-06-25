"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const ai_controller_1 = __importDefault(require("../../controllers/ai.controller"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});
// All routes require authentication
router.use(auth_1.default.isAuthenticatedUser);
// RAG Document Upload - Admin only
router.post("/upload-document", auth_1.default.authorizeRoles("ADMIN"), upload.single("file"), ai_controller_1.default.uploadDocument);
// Get all uploaded policies
router.get("/documents", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), ai_controller_1.default.getDocuments);
// Delete an uploaded policy
router.delete("/documents/:id", auth_1.default.authorizeRoles("ADMIN"), ai_controller_1.default.deleteDocument);
// Policy Q&A - All authenticated users (Admin, Manager, Staff)
router.post("/ask-policy", ai_controller_1.default.askPolicyQuestion);
// Attendance AI Assistant - Admin & Manager only
router.post("/ask-attendance", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), ai_controller_1.default.askAttendanceQuestion);
// Semantic Profile save/update - Admin & Manager only
router.post("/employee-profile", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), ai_controller_1.default.saveEmployeeProfile);
// Semantic Employee Search - Admin & Manager only
router.get("/search-employees", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), ai_controller_1.default.searchEmployees);
// AI Settings management - Admin only
router.get("/settings", auth_1.default.authorizeRoles("ADMIN"), ai_controller_1.default.getSettings);
router.post("/settings", auth_1.default.authorizeRoles("ADMIN"), ai_controller_1.default.saveSettings);
exports.default = router;
