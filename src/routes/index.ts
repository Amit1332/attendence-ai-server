import { Router } from "express";

import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import attendanceRoutes from "./attendanceRoutes";
import aiRoutes from "./aiRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/ai", aiRoutes);

export default router;