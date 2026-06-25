import { Router } from "express";
import multer from "multer";

import aiController from "../../controllers/ai.controller";
import auth from "../../middlewares/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// All routes require authentication
router.use(auth.isAuthenticatedUser);

// RAG Document Upload - Admin only
router.post(
  "/upload-document",
  auth.authorizeRoles("ADMIN"),
  upload.single("file"),
  aiController.uploadDocument
);

// Get all uploaded policies
router.get(
  "/documents",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  aiController.getDocuments
);

// Delete an uploaded policy
router.delete(
  "/documents/:id",
  auth.authorizeRoles("ADMIN"),
  aiController.deleteDocument
);

// Policy Q&A - All authenticated users (Admin, Manager, Staff)
router.post(
  "/ask-policy",
  aiController.askPolicyQuestion
);

// Attendance AI Assistant - Admin & Manager only
router.post(
  "/ask-attendance",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  aiController.askAttendanceQuestion
);

// Semantic Profile save/update - Admin & Manager only
router.post(
  "/employee-profile",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  aiController.saveEmployeeProfile
);

// Semantic Employee Search - Admin & Manager only
router.get(
  "/search-employees",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  aiController.searchEmployees
);

// AI Settings management - Admin only
router.get(
  "/settings",
  auth.authorizeRoles("ADMIN"),
  aiController.getSettings
);

router.post(
  "/settings",
  auth.authorizeRoles("ADMIN"),
  aiController.saveSettings
);

export default router;
