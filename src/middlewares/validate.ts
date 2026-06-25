import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";

import ApiError from "../utils/ApiError";

const validate = (schema: ZodTypeAny) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => issue.message)
          .join(", ");

        return next(new ApiError(400, message));
      }

      next(error);
    }
  };
};

export default validate;