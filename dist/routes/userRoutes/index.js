"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = __importDefault(require("../../controllers/user.controller"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.default.isAuthenticatedUser);
router.post("/", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), user_controller_1.default.createUser);
router.get("/", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), user_controller_1.default.getUsers);
router.get("/managers", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), user_controller_1.default.getManagers);
router.get("/:id", user_controller_1.default.getUserById);
router.patch("/:id", auth_1.default.authorizeRoles("ADMIN", "MANAGER"), user_controller_1.default.updateUser);
router.delete("/:id", auth_1.default.authorizeRoles("ADMIN"), user_controller_1.default.deleteUser);
exports.default = router;
