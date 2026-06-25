import { Router } from "express";

import attendanceController from "../../controllers/attendance.controller";
import auth from "../../middlewares/auth";

const router = Router();

// All routes require authentication
router.use(auth.isAuthenticatedUser);

router.post("/check-in", attendanceController.checkIn);
router.post("/check-out", attendanceController.checkOut);
router.get("/my-history", attendanceController.getMyAttendance);

router.get(
  "/history",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  attendanceController.getAttendanceHistory
);

export default router;
