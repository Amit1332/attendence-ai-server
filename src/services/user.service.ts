import bcrypt from "bcryptjs";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";
import { Role } from "@prisma/client";

import ApiError from "../utils/ApiError";
import userRepository from "../respositories/user.repository";

class UserService {
  async createUser(creatorRole: string, creatorId: string, userData: any) {
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Email is already taken");
    }

    let finalRole: Role = userData.role;
    let finalManagerId = userData.managerId;

    if (creatorRole === Role.MANAGER) {
      if (userData.role && userData.role !== Role.STAFF) {
        throw new ApiError(
          HTTP_STATUS_CODES.FORBIDDEN,
          "Managers can only create STAFF members"
        );
      }
      finalRole = Role.STAFF;
      finalManagerId = creatorId; // Force manager to be the creator
    }

    const hashedPassword = await bcrypt.hash(userData.password || "Password@123", 10);

    const user = await userRepository.createUser({
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

  async updateUser(creatorRole: string, creatorId: string, id: string, updateData: any) {
    const userToUpdate = await userRepository.findById(id);
    if (!userToUpdate) {
      throw new ApiError(HTTP_STATUS_CODES.NOT_FOUND, "User not found");
    }

    if (creatorRole === Role.MANAGER) {
      if (userToUpdate.managerId !== creatorId) {
        throw new ApiError(
          HTTP_STATUS_CODES.FORBIDDEN,
          "You can only update staff members assigned to you"
        );
      }
      // Manager cannot change roles
      delete updateData.role;
      // Manager cannot change manager association
      delete updateData.managerId;
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Prepare prisma update data
    const prismaUpdateData: any = {
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
      } else {
        prismaUpdateData.manager = {
          connect: { id: updateData.managerId },
        };
      }
      delete prismaUpdateData.managerId;
    }

    const updatedUser = await userRepository.updateUser(id, prismaUpdateData);
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async deleteUser(creatorRole: string, id: string) {
    if (creatorRole !== Role.ADMIN) {
      throw new ApiError(
        HTTP_STATUS_CODES.FORBIDDEN,
        "Only admins are allowed to delete users"
      );
    }

    const userToDelete = await userRepository.findById(id);
    if (!userToDelete) {
      throw new ApiError(HTTP_STATUS_CODES.NOT_FOUND, "User not found");
    }

    await userRepository.deleteUser(id);
    return true;
  }

  async getUsers(creatorRole: string, creatorId: string) {
    if (creatorRole === Role.ADMIN) {
      return userRepository.findAll({});
    } else if (creatorRole === Role.MANAGER) {
      return userRepository.findAll({
        managerId: creatorId,
      });
    } else {
      throw new ApiError(
        HTTP_STATUS_CODES.FORBIDDEN,
        "You do not have permission to view users"
      );
    }
  }

  async getManagers() {
    return userRepository.findManagers();
  }

  async getUserById(creatorRole: string, creatorId: string, id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(HTTP_STATUS_CODES.NOT_FOUND, "User not found");
    }

    if (creatorRole === Role.MANAGER && user.managerId !== creatorId && user.id !== creatorId) {
      throw new ApiError(
        HTTP_STATUS_CODES.FORBIDDEN,
        "You do not have permission to view this user's details"
      );
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export default new UserService();
