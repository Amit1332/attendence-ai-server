import prisma from "../config/prisma";
import { Prisma, User } from "@prisma/client";

class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async saveRefreshToken(userId: string, token: string) {
    return prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async deleteRefreshToken(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: {
        userId,
      },
    });
  }

  async deleteToken(token: string) {
    return prisma.refreshToken.deleteMany({
      where: {
        token,
      },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findFirst({
      where: {
        token,
      },
    });
  }
}

export default new AuthRepository();