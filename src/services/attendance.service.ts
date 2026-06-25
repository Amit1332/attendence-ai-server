import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";
import { Role } from "@prisma/client";

import ApiError from "../utils/ApiError";
import attendanceRepository from "../respositories/attendance.repository";
import { getIO } from "../utils/socket";

class AttendanceService {
  async checkIn(userId: string) {
    const activeCheckIn = await attendanceRepository.findActiveCheckIn(userId);
    if (activeCheckIn) {
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "You are already checked in. Please check out before checking in again."
      );
    }

    const attendance = await attendanceRepository.createAttendance({
      userId,
      checkIn: new Date(),
    });

    // Notify dashboard in real-time
    try {
      const io = getIO();
      io.emit("attendance:checkin", attendance);
    } catch (e) {
      console.warn("Socket.io not active, skipped check-in broadcast");
    }

    return attendance;
  }

  async checkOut(userId: string) {
    const activeCheckIn = await attendanceRepository.findActiveCheckIn(userId);
    if (!activeCheckIn) {
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "No active check-in record found. Please check in first."
      );
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(activeCheckIn.checkIn);

    // Calculate working hours
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // Calculate overtime (standard shift is 8 hours)
    const overtimeHours = workingHours > 8 ? parseFloat((workingHours - 8).toFixed(2)) : 0;

    const attendance = await attendanceRepository.updateAttendance(activeCheckIn.id, {
      checkOut: checkOutTime,
      workingHours,
      overtimeHours,
    });

    // Notify dashboard in real-time
    try {
      const io = getIO();
      io.emit("attendance:checkout", attendance);
    } catch (e) {
      console.warn("Socket.io not active, skipped check-out broadcast");
    }

    return attendance;
  }

  async getOwnAttendance(userId: string) {
    return attendanceRepository.findByUserId(userId);
  }

  async getAttendanceHistory(creatorRole: Role, creatorId: string) {
    if (creatorRole === Role.ADMIN) {
      return attendanceRepository.findAll({});
    } else if (creatorRole === Role.MANAGER) {
      return attendanceRepository.findAll({
        user: {
          managerId: creatorId,
        },
      });
    } else {
      throw new ApiError(
        HTTP_STATUS_CODES.FORBIDDEN,
        "Access denied. You do not have permission to view general attendance history."
      );
    }
  }
}

export default new AttendanceService();
