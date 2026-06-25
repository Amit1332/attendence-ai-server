import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

class AttendanceRepository {
  async findActiveCheckIn(userId: string) {
    return prisma.attendance.findFirst({
      where: {
        userId,
        checkOut: null,
      },
    });
  }

  async createAttendance(data: Prisma.AttendanceUncheckedCreateInput) {
    return prisma.attendance.create({
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async updateAttendance(id: string, data: Prisma.AttendanceUpdateInput) {
    return prisma.attendance.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.attendance.findMany({
      where: {
        userId,
      },
      orderBy: {
        checkIn: "desc",
      },
    });
  }

  async findAll(where: Prisma.AttendanceWhereInput) {
    return prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        checkIn: "desc",
      },
    });
  }
}

export default new AttendanceRepository();
