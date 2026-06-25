"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../../controllers");
const validate_1 = __importDefault(require("../../middlewares/validate"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const auth_validation_1 = require("../../validators/auth.validation");
const router = (0, express_1.Router)();
router.post("/register", (0, validate_1.default)(auth_validation_1.register), controllers_1.authController.register);
router.post("/login", (0, validate_1.default)(auth_validation_1.login), controllers_1.authController.login);
router.post("/logout", auth_1.default.isAuthenticatedUser, controllers_1.authController.logout);
router.post("/refresh-token", controllers_1.authController.refreshToken);
router.get("/profile", auth_1.default.isAuthenticatedUser, controllers_1.authController.profile);
exports.default = router;
