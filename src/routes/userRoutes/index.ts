import { Router } from "express";

import userController from "../../controllers/user.controller";
import auth from "../../middlewares/auth";

const router = Router();

// All routes require authentication
router.use(auth.isAuthenticatedUser);

router.post(
  "/",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  userController.createUser
);

router.get(
  "/",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  userController.getUsers
);

router.get(
  "/managers",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  userController.getManagers
);

router.get(
  "/:id",
  userController.getUserById
);

router.patch(
  "/:id",
  auth.authorizeRoles("ADMIN", "MANAGER"),
  userController.updateUser
);

router.delete(
  "/:id",
  auth.authorizeRoles("ADMIN"),
  userController.deleteUser
);

export default router;
