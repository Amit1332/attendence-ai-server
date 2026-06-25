import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";

import catchAsync from "../utils/catchAsync";
import userService from "../services/user.service";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createUser(
    req.user!.role,
    req.user!.id,
    req.body
  );

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    message: "User created successfully.",
    data: result,
  });
});

const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUsers(req.user!.role, req.user!.id);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: result,
  });
});

const getManagers = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getManagers();

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: result,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserById(
    req.user!.role,
    req.user!.id,
    req.params.id as string
  );

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: result,
  });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.updateUser(
    req.user!.role,
    req.user!.id,
    req.params.id as string,
    req.body
  );

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "User updated successfully.",
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await userService.deleteUser(req.user!.role, req.params.id as string);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "User deleted successfully.",
  });
});

export default {
  createUser,
  getUsers,
  getManagers,
  getUserById,
  updateUser,
  deleteUser,
};
