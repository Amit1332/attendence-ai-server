import prisma from "../config/prisma";
import { Prisma, Role } from "@prisma/client";

class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        department: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
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

  async deleteUser(id: string) {
    // Delete related refresh tokens first to prevent foreign key constraint issues
    await prisma.refreshToken.deleteMany({
      where: { userId: id },
    });
    // Delete attendances
    await prisma.attendance.deleteMany({
      where: { userId: id },
    });
    // Delete embeddings
    await prisma.employeeEmbedding.deleteMany({
      where: { userId: id },
    });
    // Delete documents
    await prisma.document.deleteMany({
      where: { uploadedById: id },
    });

    return prisma.user.delete({
      where: { id },
    });
  }

  async findAll(where: Prisma.UserWhereInput) {
    return prisma.user.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        department: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findManagers() {
    return prisma.user.findMany({
      where: {
        role: Role.MANAGER,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
  }
}

export default new UserRepository();
