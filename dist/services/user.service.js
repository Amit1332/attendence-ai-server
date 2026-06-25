"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_status_codes_1 = require("@simple-node/http-status-codes");
const client_1 = require("@prisma/client");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const user_repository_1 = __importDefault(require("../respositories/user.repository"));
class UserService {
    async createUser(creatorRole, creatorId, userData) {
        const existingUser = await user_repository_1.default.findByEmail(userData.email);
        if (existingUser) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Email is already taken");
        }
        let finalRole = userData.role;
        let finalManagerId = userData.managerId;
        if (creatorRole === client_1.Role.MANAGER) {
            if (userData.role && userData.role !== client_1.Role.STAFF) {
                throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.FORBIDDEN, "Managers can only create STAFF members");
            }
            finalRole = client_1.Role.STAFF;
            finalManagerId = creatorId; // Force manager to be the creator
        }
        const hashedPassword = await bcryptjs_1.default.hash(userData.password || "Password@123", 10);
        const user = await user_repository_1.default.createUser({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            password: hashedPassword,
            phone: userData.phone,
            role: finalRole,
            isActive: true,
            ...(finalManagerId && {
                manager: {
                    connect: { id: finalManagerId },
                },
            }),
            ...(userData.departmentId && {
                department: {
                    connect: { id: userData.departmentId },
                },
            }),
        });
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    async updateUser(creatorRole, creatorId, id, updateData) {
        const userToUpdate = await user_repository_1.default.findById(id);
        if (!userToUpdate) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.NOT_FOUND, "User not found");
        }
        if (creatorRole === client_1.Role.MANAGER) {
            if (userToUpdate.managerId !== creatorId) {
                throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.FORBIDDEN, "You can only update staff members assigned to you");
            }
            // Manager cannot change roles
            delete updateData.role;
            // Manager cannot change manager association
            delete updateData.managerId;
        }
        if (updateData.password) {
            updateData.password = await bcryptjs_1.default.hash(updateData.password, 10);
        }
        // Prepare prisma update data
        const prismaUpdateData = {
            ...updateData,
        };
        if (updateData.departmentId) {
            prismaUpdateData.department = {
                connect: { id: updateData.departmentId },
            };
            delete prismaUpdateData.departmentId;
        }
        if (updateData.managerId !== undefined) {
            if (updateData.managerId === null) {
                prismaUpdateData.manager = {
                    disconnect: true,
                };
            }
            else {
                prismaUpdateData.manager = {
                    connect: { id: updateData.managerId },
                };
            }
            delete prismaUpdateData.managerId;
        }
        const updatedUser = await user_repository_1.default.updateUser(id, prismaUpdateData);
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
    async deleteUser(creatorRole, id) {
        if (creatorRole !== client_1.Role.ADMIN) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.FORBIDDEN, "Only admins are allowed to delete users");
        }
        const userToDelete = await user_repository_1.default.findById(id);
        if (!userToDelete) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.NOT_FOUND, "User not found");
        }
        await user_repository_1.default.deleteUser(id);
        return true;
    }
    async getUsers(creatorRole, creatorId) {
        if (creatorRole === client_1.Role.ADMIN) {
            return user_repository_1.default.findAll({});
        }
        else if (creatorRole === client_1.Role.MANAGER) {
            return user_repository_1.default.findAll({
                managerId: creatorId,
            });
        }
        else {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.FORBIDDEN, "You do not have permission to view users");
        }
    }
    async getManagers() {
        return user_repository_1.default.findManagers();
    }
    async getUserById(creatorRole, creatorId, id) {
        const user = await user_repository_1.default.findById(id);
        if (!user) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.NOT_FOUND, "User not found");
        }
        if (creatorRole === client_1.Role.MANAGER && user.managerId !== creatorId && user.id !== creatorId) {
            throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.FORBIDDEN, "You do not have permission to view this user's details");
        }
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
exports.default = new UserService();
