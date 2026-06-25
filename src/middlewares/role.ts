import { NextFunction, Request, Response } from "express";

import ApiError from "../utils/ApiError";
import { Role } from "@prisma/client";

const authorize = (...roles: Role[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {

    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }

    next();
  };
};

export default authorize;