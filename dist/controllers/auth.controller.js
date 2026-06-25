"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_codes_1 = require("@simple-node/http-status-codes");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const auth_service_1 = __importDefault(require("../services/auth.service"));
const register = (0, catchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.default.register(req.body);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.CREATED).json({
        success: true,
        message: "User registered successfully.",
        data: result,
    });
});
const login = (0, catchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.default.login(req.body);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Login successful.",
        data: result,
    });
});
const logout = (0, catchAsync_1.default)(async (req, res) => {
    await auth_service_1.default.logout(req.user.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Logout successful.",
    });
});
const profile = (0, catchAsync_1.default)(async (req, res) => {
    const user = await auth_service_1.default.getProfile(req.user.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: user,
    });
});
const refreshToken = (0, catchAsync_1.default)(async (req, res) => {
    const result = await auth_service_1.default.refreshToken(req.body.refreshToken);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: result,
    });
});
exports.default = {
    register,
    login,
    logout,
    profile,
    refreshToken,
};
