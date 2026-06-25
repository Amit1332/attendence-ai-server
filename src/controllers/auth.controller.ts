import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";

import catchAsync from "../utils/catchAsync";
import authService from "../services/auth.service";

const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    message: "User registered successfully.",
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "Login successful.",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  await authService.logout(req.user!.id);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "Logout successful.",
  });
});

const profile = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.id);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: user,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.refreshToken(req.body.refreshToken);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: result,
  });
});

export default {
  register,
  login,
  logout,
  profile,
  refreshToken,
};