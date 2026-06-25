import {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";

import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";

import ApiError from "../utils/ApiError";
import config from "../config/config";

export const errorConverter: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode =
      (error as any).statusCode ||
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;

    const message =
      error.message ||
      HTTP_STATUS_CODES[statusCode];

    error = new ApiError(
      statusCode,
      message,
      false,
      error.stack
    );
  }

  next(error);
};

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  let statusCode = err.statusCode;
  let message = err.message;

  if (
    config.env === "production" &&
    !err.isOperational
  ) {
    statusCode =
      HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR;

    message =
      HTTP_STATUS_CODES[
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR
      ];
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,

    code: statusCode,

    message,

    ...(config.env === "development" && {
      stack: err.stack,
    }),
  };

  if (config.env === "development") {
    console.error(err);
  }

  res.status(statusCode).json(response);
};