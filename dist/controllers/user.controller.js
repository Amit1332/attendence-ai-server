"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_codes_1 = require("@simple-node/http-status-codes");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const user_service_1 = __importDefault(require("../services/user.service"));
const createUser = (0, catchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.default.createUser(req.user.role, req.user.id, req.body);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.CREATED).json({
        success: true,
        message: "User created successfully.",
        data: result,
    });
});
const getUsers = (0, catchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.default.getUsers(req.user.role, req.user.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: result,
    });
});
const getManagers = (0, catchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.default.getManagers();
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: result,
    });
});
const getUserById = (0, catchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.default.getUserById(req.user.role, req.user.id, req.params.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: result,
    });
});
const updateUser = (0, catchAsync_1.default)(async (req, res) => {
    const result = await user_service_1.default.updateUser(req.user.role, req.user.id, req.params.id, req.body);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "User updated successfully.",
        data: result,
    });
});
const deleteUser = (0, catchAsync_1.default)(async (req, res) => {
    await user_service_1.default.deleteUser(req.user.role, req.params.id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "User deleted successfully.",
    });
});
exports.default = {
    createUser,
    getUsers,
    getManagers,
    getUserById,
    updateUser,
    deleteUser,
};
