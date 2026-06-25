import { Router } from "express";

import { authController } from "../../controllers";
import validate from "../../middlewares/validate";
import auth from "../../middlewares/auth";
import { login, register } from "../../validators/auth.validation";

const router = Router();

router.post(
    "/register",
    validate(register),
    authController.register
);

router.post(
    "/login",
    validate(login),
    authController.login
);


router.post(
  "/logout",
  auth.isAuthenticatedUser,
  authController.logout
);

router.post(
  "/refresh-token",
  authController.refreshToken
);

router.get(
  "/profile",
  auth.isAuthenticatedUser,
  authController.profile
);

export default router;