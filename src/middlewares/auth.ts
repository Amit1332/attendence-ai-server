import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import prisma from "../config/prisma";
import config from "../config/config";

import ApiError from "../utils/ApiError";
import { JwtPayload } from "../types/jwt";

const isAuthenticatedUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new ApiError(401, "Authentication token is missing."));
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      config.jwt.secret
    ) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return next(new ApiError(401, "User not found."));
    }

    if (!user.isActive) {
      return next(new ApiError(403, "User account is inactive."));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(new ApiError(401, "Invalid or expired access token."));
  }
};

const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(403, "You do not have permission to perform this action.")
      );
    }
    next();
  };
};

export default {
  isAuthenticatedUser,
  authorizeRoles,
};