import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";

import catchAsync from "../utils/catchAsync";
import attendanceService from "../services/attendance.service";

const checkIn = catchAsync(async (req: Request, res: Response) => {
  const result = await attendanceService.checkIn(req.user!.id);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "Checked in successfully.",
    data: result,
  });
});

const checkOut = catchAsync(async (req: Request, res: Response) => {
  const result = await attendanceService.checkOut(req.user!.id);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "Checked out successfully.",
    data: result,
  });
});

const getMyAttendance = catchAsync(async (req: Request, res: Response) => {
  const result = await attendanceService.getOwnAttendance(req.user!.id);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: result,
  });
});

const getAttendanceHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await attendanceService.getAttendanceHistory(
    req.user!.role,
    req.user!.id
  );

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: result,
  });
});

export default {
  checkIn,
  checkOut,
  getMyAttendance,
  getAttendanceHistory,
};
